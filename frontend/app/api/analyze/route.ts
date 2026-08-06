import { spawn } from "child_process";
import { join } from "path";
import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { analyzePlainText, type AnalyzeResponse } from "@/lib/document-analysis";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const OCR_PAGE_LIMIT = 3;
const OCR_TIMEOUT_MS = 25_000;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "image/png",
  "image/jpeg",
  "image/tiff"
]);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return jsonError("Upload a file to analyze.", 400);
    }
    if (file.size === 0) {
      return jsonError("The uploaded document is empty.", 400);
    }
    if (file.size > MAX_FILE_SIZE) {
      return jsonError("File size must be 15 MB or less for this live demo.", 400);
    }
    if (!isAllowed(file)) {
      return jsonError("Supported files: PDF, DOCX, TXT, Markdown, PNG, JPG, and TIFF.", 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const extracted = await extractText(file, buffer);
    const document = analyzePlainText({
      id: crypto.randomUUID(),
      filename: file.name,
      mimeType: file.type || inferMimeType(file.name),
      sizeBytes: file.size,
      text: extracted.text,
      limitations: extracted.limitations
    });

    return NextResponse.json({ ok: true, document } satisfies AnalyzeResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to analyze this document.";
    return jsonError(message, 500);
  }
}

async function extractText(file: File, buffer: Buffer) {
  const type = file.type || inferMimeType(file.name);

  if (type === "text/plain" || type === "text/markdown" || /\.(txt|md|markdown)$/i.test(file.name)) {
    return { text: buffer.toString("utf-8"), limitations: [] };
  }

  if (type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || /\.docx$/i.test(file.name)) {
    const result = await mammoth.extractRawText({ buffer });
    return { text: result.value, limitations: result.messages.map((message) => message.message).filter(Boolean) };
  }

  if (type === "application/pdf" || /\.pdf$/i.test(file.name)) {
    const fallbackText = extractPdfLiteralText(buffer);
    if (hasUsefulExtractedText(fallbackText)) {
      return { text: fallbackText, limitations: ["Used lightweight PDF text extraction fallback. Layout may be incomplete."] };
    }

    const embeddedImages = extractEmbeddedPdfImages(buffer);
    if (embeddedImages.length > 0) {
      const ocr = await extractPdfImageTextWithOcr(embeddedImages);
      if (ocr.text) {
        return {
          text: ocr.text,
          limitations: [
            `OCR extracted text from ${ocr.pagesProcessed} of ${ocr.pageCount} embedded PDF image${ocr.pageCount === 1 ? "" : "s"}.`,
            ...(ocr.pageCount > ocr.pagesProcessed ? [`OCR is limited to the first ${OCR_PAGE_LIMIT} embedded images in this live Vercel demo.`] : [])
          ]
        };
      }
      return {
        text: "",
        limitations: [
          "Embedded PDF images were found, but OCR could not extract readable text. Try a higher-resolution scan.",
          ...(ocr.error ? [`OCR detail: ${ocr.error}`] : [])
        ]
      };
    }

    const parsed = await extractPdfTextWithParser(buffer);
    if (parsed.text) {
      return { text: parsed.text, limitations: [] };
    }

    return {
      text: "",
      limitations: [
        "No selectable or OCR-readable PDF text could be extracted. Try a clearer scan or a smaller PDF.",
        ...(parsed.error ? [`Selectable-text parser detail: ${parsed.error}`] : [])
      ]
    };
  }

  const imageOcr = await extractImageTextWithOcr(buffer);
  return imageOcr.text
    ? { text: imageOcr.text, limitations: ["OCR extracted text from the uploaded image. Accuracy depends on scan quality."] }
    : { text: "", limitations: [`Image OCR could not extract readable text.${imageOcr.error ? ` OCR detail: ${imageOcr.error}` : ""}`] };
}

function isAllowed(file: File) {
  return ALLOWED_TYPES.has(file.type) || /\.(pdf|docx|txt|md|markdown|png|jpe?g|tiff?)$/i.test(file.name);
}

function inferMimeType(filename: string) {
  if (/\.pdf$/i.test(filename)) return "application/pdf";
  if (/\.docx$/i.test(filename)) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (/\.(md|markdown)$/i.test(filename)) return "text/markdown";
  if (/\.txt$/i.test(filename)) return "text/plain";
  if (/\.png$/i.test(filename)) return "image/png";
  if (/\.jpe?g$/i.test(filename)) return "image/jpeg";
  if (/\.tiff?$/i.test(filename)) return "image/tiff";
  return "application/octet-stream";
}

async function ensureCanvasGlobals() {
  const canvas = await import("@napi-rs/canvas");
  const globals = globalThis as Record<string, unknown>;
  globals.DOMMatrix ??= canvas.DOMMatrix;
  globals.DOMPoint ??= canvas.DOMPoint;
  globals.DOMRect ??= canvas.DOMRect;
  globals.ImageData ??= canvas.ImageData;
  globals.Path2D ??= canvas.Path2D;
  return canvas;
}

async function extractPdfTextWithParser(buffer: Buffer) {
  let parser: { getText: () => Promise<{ text: string }>; destroy: () => Promise<void> } | undefined;
  try {
    await ensureCanvasGlobals();
    const { PDFParse } = await import("pdf-parse");
    parser = new PDFParse({ data: buffer });
    const result = await withTimeout(parser.getText(), 8000);
    return hasUsefulExtractedText(result.text) ? { text: result.text, error: "" } : { text: "", error: "No useful selectable text found." };
  } catch (error) {
    return { text: "", error: error instanceof Error ? error.message : "PDF parser failed." };
  } finally {
    await parser?.destroy().catch(() => undefined);
  }
}

async function extractPdfImageTextWithOcr(images: Buffer[]) {
  try {
    if (images.length === 0) {
      return { text: "", pageCount: 0, pagesProcessed: 0, error: "No JPEG scan images were found inside the PDF." };
    }
    const imagesToProcess = images.slice(0, OCR_PAGE_LIMIT);
    const text = await withTimeout(recognizeImages(imagesToProcess), 25000);
    return { text, pageCount: images.length, pagesProcessed: imagesToProcess.length, error: "" };
  } catch (error) {
    return { text: "", pageCount: 0, pagesProcessed: 0, error: error instanceof Error ? error.message : "OCR failed." };
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`Timed out after ${ms / 1000} seconds.`)), ms);
    })
  ]);
}

async function extractImageTextWithOcr(buffer: Buffer) {
  try {
    return { text: await recognizeImages([buffer]), error: "" };
  } catch (error) {
    return { text: "", error: error instanceof Error ? error.message : "OCR failed." };
  }
}

async function recognizeImages(images: Buffer[]) {
  return runOcrChildProcess({
    cachePath: process.env.VERCEL ? "/tmp/tesseract-cache" : join(process.cwd(), "tmp", "tess-cache"),
    images: images.map((image) => image.toString("base64")),
    langPath: join(process.cwd(), "node_modules", "@tesseract.js-data", "eng", "4.0.0")
  });
}

function runOcrChildProcess(payload: { cachePath: string; images: string[]; langPath: string }) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(process.execPath, ["--input-type=module", "-e", OCR_CHILD_SCRIPT], {
      cwd: process.cwd(),
      env: ocrChildEnvironment() as NodeJS.ProcessEnv
    });
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`OCR timed out after ${OCR_TIMEOUT_MS / 1000} seconds.`));
    }, OCR_TIMEOUT_MS);
    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve(stdout.trim());
        return;
      }
      reject(new Error(stderr.trim() || `OCR worker exited with code ${code}.`));
    });

    child.stdin?.end(JSON.stringify(payload));
  });
}

function ocrChildEnvironment() {
  const allowed = ["PATH", "Path", "SystemRoot", "TEMP", "TMP", "HOME", "USERPROFILE", "VERCEL", "VERCEL_ENV"];
  return Object.fromEntries(allowed.map((key) => [key, process.env[key]]).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

const OCR_CHILD_SCRIPT = `
import { createWorker, PSM } from "tesseract.js";

let input = "";
for await (const chunk of process.stdin) {
  input += chunk;
}

const payload = JSON.parse(input);
const worker = await createWorker("eng", 1, {
  cachePath: payload.cachePath,
  gzip: true,
  langPath: payload.langPath
});

try {
  await worker.setParameters({
    tessedit_pageseg_mode: PSM.AUTO,
    preserve_interword_spaces: "1"
  });
  const pages = [];
  for (const encoded of payload.images) {
    const result = await worker.recognize(Buffer.from(encoded, "base64"));
    const text = result.data.text.trim();
    if (text) pages.push(text);
  }
  process.stdout.write(pages.join("\\n\\n").trim());
} finally {
  await worker.terminate();
}
`;

function extractPdfLiteralText(buffer: Buffer) {
  const source = buffer.toString("latin1");
  const pieces: string[] = [];

  for (const match of source.matchAll(/\[([\s\S]*?)\]\s*TJ/g)) {
    const array = match[1] ?? "";
    pieces.push(...decodePdfStrings(array));
  }
  for (const match of source.matchAll(/(?:^|[^\\])\(((?:\\.|[^\\)])*)\)\s*Tj/g)) {
    const text = match[1];
    if (text) pieces.push(decodePdfString(text));
  }

  return pieces
    .map((piece) => piece.replace(/\s+/g, " ").trim())
    .filter((piece) => /[A-Za-z0-9]/.test(piece))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractEmbeddedPdfImages(buffer: Buffer) {
  const source = buffer.toString("latin1");
  const images: Buffer[] = [];
  const streamPattern = /<<(?:.|\s)*?\/Subtype\s*\/Image(?:.|\s)*?\/Filter\s*(?:\/DCTDecode|\[\s*\/DCTDecode\s*\])(?:.|\s)*?>>\s*stream\r?\n/g;

  for (const match of source.matchAll(streamPattern)) {
    const start = match.index === undefined ? -1 : match.index + match[0].length;
    if (start < 0) continue;
    const end = source.indexOf("endstream", start);
    if (end <= start) continue;
    let image = buffer.subarray(start, end);
    while (image.length > 0 && (image[image.length - 1] === 0x0a || image[image.length - 1] === 0x0d || image[image.length - 1] === 0x20)) {
      image = image.subarray(0, image.length - 1);
    }
    if (image.length > 100 && image[0] === 0xff && image[1] === 0xd8) {
      images.push(image);
    }
  }

  return images;
}

function hasUsefulExtractedText(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const alphaWords = normalized.match(/[A-Za-z][A-Za-z0-9'-]{2,}/g) ?? [];
  return normalized.length >= 30 && alphaWords.length >= 4;
}

function decodePdfStrings(value: string) {
  return Array.from(value.matchAll(/(?:^|[^\\])\(((?:\\.|[^\\)])*)\)/g), (match) => decodePdfString(match[1] ?? ""));
}

function decodePdfString(value: string) {
  return value
    .replace(/\\([nrtbf()\\])/g, (_, escaped: string) => {
      const replacements: Record<string, string> = { n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", "(": "(", ")": ")", "\\": "\\" };
      return replacements[escaped] ?? escaped;
    })
    .replace(/\\([0-7]{1,3})/g, (_, octal: string) => String.fromCharCode(Number.parseInt(octal, 8)));
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error } satisfies AnalyzeResponse, { status });
}
