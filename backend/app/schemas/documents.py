from pydantic import BaseModel


class UploadResponse(BaseModel):
    document_id: str
    job_id: str
    status: str


class DocumentResponse(BaseModel):
    id: str
    filename: str
    mime_type: str
    status: str
    size_bytes: int
    page_count: int | None = None
