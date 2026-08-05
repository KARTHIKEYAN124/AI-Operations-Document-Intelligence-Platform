from dataclasses import dataclass
from hashlib import sha256

from fastapi import UploadFile

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/markdown",
    "image/png",
    "image/jpeg",
    "image/tiff",
}
MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024


@dataclass(frozen=True)
class UploadValidation:
    accepted: bool
    reason: str | None
    content_hash: str | None = None
    size_bytes: int = 0


async def validate_upload(file: UploadFile) -> UploadValidation:
    content = await file.read()
    await file.seek(0)

    if file.content_type not in ALLOWED_MIME_TYPES:
        return UploadValidation(False, "Unsupported file type")
    if len(content) > MAX_FILE_SIZE_BYTES:
        return UploadValidation(False, "File exceeds maximum size")
    if len(content) == 0:
        return UploadValidation(False, "Document is empty")

    return UploadValidation(True, None, sha256(content).hexdigest(), len(content))


def extract_text(filename: str, content: bytes) -> str:
    if not content:
        raise ValueError("Document is empty")
    if filename.lower().endswith((".txt", ".md")):
        return content.decode("utf-8", errors="replace").strip()
    return "Text extraction adapter placeholder for PDF, DOCX, and OCR-backed image files."
