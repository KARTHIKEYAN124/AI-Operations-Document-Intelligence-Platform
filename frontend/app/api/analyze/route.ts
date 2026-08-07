import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { analyzePlainText, type AnalyzeResponse } from "@/lib/document-analysis";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "application/rtf",
  "text/rtf",
  "image/png",
  "image/jpeg",
  "image/tiff",
  "image/webp",
  "image/bmp"
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
      return jsonError("File size must be 15 MB or less for browser-based extraction.", 400);
    }
    if (!isAllowed(file)) {
      return jsonError("Supported files: PDF, DOC, DOCX, TXT, Markdown, RTF, CSV, JSON, PNG, JPG, TIFF, WEBP, and BMP.", 400);
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

  if (isPlainTextLike(type, file.name)) {
    return { text: buffer.toString("utf-8"), limitations: [] };
  }

  if (type === "application/msword" || /\.doc$/i.test(file.name)) {
    return {
      text: extractLegacyDocText(buffer),
      limitations: ["Used best-effort legacy DOC text extraction. Convert to DOCX for higher fidelity."]
    };
  }

  if (type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || /\.docx$/i.test(file.name)) {
    const result = await mammoth.extractRawText({ buffer });
    return { text: result.value, limitations: result.messages.map((message) => message.message).filter(Boolean) };
  }

  if (type === "application/pdf" || /\.pdf$/i.test(file.name)) {
    const embeddedImages = extractEmbeddedPdfImages(buffer);
    if (embeddedImages.length > 0) {
      return {
        text: "",
        limitations: ["This PDF appears to contain scanned page images. Browser OCR will attempt extraction after upload."]
      };
    }

    const fallbackText = extractPdfLiteralText(buffer);
    if (hasUsefulExtractedText(fallbackText)) {
      return { text: fallbackText, limitations: ["Used lightweight PDF text extraction fallback. Layout may be incomplete."] };
    }

    return {
      text: "",
      limitations: ["No literal PDF text or embedded scan images were found. Try DOCX/TXT export or upload a scanned/image PDF for browser OCR."]
    };
  }

  const imageOcr = await extractImageTextWithOcr(buffer);
  return imageOcr;
}

function isAllowed(file: File) {
  return ALLOWED_TYPES.has(file.type) || /\.(pdf|docx?|txt|md|markdown|rtf|csv|json|png|jpe?g|tiff?|webp|bmp)$/i.test(file.name);
}

function inferMimeType(filename: string) {
  if (/\.pdf$/i.test(filename)) return "application/pdf";
  if (/\.doc$/i.test(filename)) return "application/msword";
  if (/\.docx$/i.test(filename)) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (/\.rtf$/i.test(filename)) return "application/rtf";
  if (/\.csv$/i.test(filename)) return "text/csv";
  if (/\.json$/i.test(filename)) return "application/json";
  if (/\.(md|markdown)$/i.test(filename)) return "text/markdown";
  if (/\.txt$/i.test(filename)) return "text/plain";
  if (/\.png$/i.test(filename)) return "image/png";
  if (/\.jpe?g$/i.test(filename)) return "image/jpeg";
  if (/\.tiff?$/i.test(filename)) return "image/tiff";
  if (/\.webp$/i.test(filename)) return "image/webp";
  if (/\.bmp$/i.test(filename)) return "image/bmp";
  return "application/octet-stream";
}

function isPlainTextLike(type: string, filename: string) {
  return (
    type === "text/plain" ||
    type === "text/markdown" ||
    type === "text/csv" ||
    type === "application/json" ||
    type === "application/rtf" ||
    type === "text/rtf" ||
    /\.(txt|md|markdown|rtf|csv|json)$/i.test(filename)
  );
}

async function extractImageTextWithOcr(buffer: Buffer) {
  return {
    text: "",
    limitations: [`Image file detected (${buffer.length.toLocaleString()} bytes). Browser OCR will attempt extraction after upload.`]
  };
}

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

function extractLegacyDocText(buffer: Buffer) {
  return buffer
    .toString("latin1")
    .replace(/[^\x09\x0a\x0d\x20-\x7e]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractEmbeddedPdfImages(buffer: Buffer) {
  const source = buffer.toString("latin1");
  const images: Buffer[] = [];
  let searchFrom = 0;

  while (searchFrom < source.length) {
    const streamIndex = source.indexOf("stream", searchFrom);
    if (streamIndex === -1) break;
    const header = source.slice(Math.max(0, streamIndex - 1500), streamIndex);
    searchFrom = streamIndex + 6;

    if (!/\/Subtype\s*\/Image/.test(header) || !/\/DCTDecode/.test(header)) continue;

    let start = streamIndex + 6;
    if (source[start] === "\r" && source[start + 1] === "\n") start += 2;
    else if (source[start] === "\n" || source[start] === "\r") start += 1;

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
