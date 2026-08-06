import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { analyzePlainText, type AnalyzeResponse } from "@/lib/document-analysis";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_FILE_SIZE = 15 * 1024 * 1024;
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
    let parser: { getText: () => Promise<{ text: string }>; destroy: () => Promise<void> } | undefined;
    try {
      const { PDFParse } = await import("pdf-parse");
      parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      return {
        text: result.text,
        limitations: result.text.trim() ? [] : ["No selectable text was found. Scanned PDFs need OCR."]
      };
    } catch (error) {
      const fallbackText = extractPdfLiteralText(buffer);
      const detail = error instanceof Error ? error.message : "PDF parser failed.";
      if (fallbackText) {
        return {
          text: fallbackText,
          limitations: [`Used lightweight PDF text extraction fallback because the full parser failed: ${detail}`]
        };
      }
      return {
        text: "",
        limitations: [`No selectable PDF text could be extracted. Scanned or image-only PDFs need OCR. Parser detail: ${detail}`]
      };
    } finally {
      await parser?.destroy().catch(() => undefined);
    }
  }

  return {
    text: "",
    limitations: ["Image OCR is not configured in this Vercel demo. Add OCR with Tesseract, Azure Vision, Google Vision, or a backend worker."]
  };
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
