from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.schemas.documents import DocumentResponse, UploadResponse
from app.services.document_parser import validate_upload

router = APIRouter()


@router.post("/upload", response_model=UploadResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_document(file: UploadFile = File(...)) -> UploadResponse:
    validation = await validate_upload(file)
    if not validation.accepted:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=validation.reason)

    return UploadResponse(document_id="demo-document", job_id="demo-job", status="queued")


@router.get("", response_model=list[DocumentResponse])
def list_documents() -> list[DocumentResponse]:
    return [
        DocumentResponse(
            id="demo-document",
            filename="Contract_2024_05_14.pdf",
            mime_type="application/pdf",
            status="processing",
            size_bytes=2_400_000,
            page_count=12,
        )
    ]


@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(document_id: str) -> DocumentResponse:
    return DocumentResponse(
        id=document_id,
        filename="Contract_2024_05_14.pdf",
        mime_type="application/pdf",
        status="processing",
        size_bytes=2_400_000,
        page_count=12,
    )


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(document_id: str) -> None:
    return None
