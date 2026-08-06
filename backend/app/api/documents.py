from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.entities import AuditLog, Document, ProcessingJob, User, new_id
from app.schemas.documents import DocumentResponse, UploadResponse
from app.security import get_current_user
from app.services.document_parser import validate_upload
from app.services.document_pipeline import process_document

router = APIRouter()


@router.post("/upload", response_model=UploadResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_document(file: UploadFile = File(...), user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> UploadResponse:
    validation = await validate_upload(file)
    if not validation.accepted:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=validation.reason)
    assert validation.content_hash is not None

    duplicate = db.query(Document).filter(Document.sha256 == validation.content_hash, Document.owner_id == user.id).first()
    if duplicate:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Duplicate upload detected")

    document = Document(
        id=new_id(),
        owner_id=user.id,
        filename=file.filename or "upload",
        mime_type=file.content_type or "application/octet-stream",
        sha256=validation.content_hash,
        status="processing",
        size_bytes=validation.size_bytes,
    )
    db.add(document)
    db.add(AuditLog(id=new_id(), actor_id=user.id, action="document.uploaded", metadata_json={"filename": document.filename}))
    db.commit()
    db.refresh(document)

    analysis = process_document(db, document, validation.content, user)
    job = db.query(ProcessingJob).filter(ProcessingJob.document_id == document.id).order_by(ProcessingJob.created_at.desc()).first()
    return UploadResponse(document_id=document.id, job_id=job.id if job else analysis.id, status=document.status)


@router.get("", response_model=list[DocumentResponse])
def list_documents(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[DocumentResponse]:
    documents = db.query(Document).filter(Document.owner_id == user.id).order_by(Document.created_at.desc()).all()
    return [to_document_response(document) for document in documents]


@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(document_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> DocumentResponse:
    document = owned_document(db, document_id, user)
    return to_document_response(document)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(document_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> None:
    document = owned_document(db, document_id, user)
    db.delete(document)
    db.add(AuditLog(id=new_id(), actor_id=user.id, action="document.deleted", metadata_json={"document_id": document_id}))
    db.commit()


def owned_document(db: Session, document_id: str, user: User) -> Document:
    document = db.get(Document, document_id)
    if not document or (document.owner_id != user.id and user.role != "admin"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return document


def to_document_response(document: Document) -> DocumentResponse:
    return DocumentResponse(
        id=document.id,
        filename=document.filename,
        mime_type=document.mime_type,
        status=document.status,
        size_bytes=document.size_bytes,
        page_count=document.page_count,
    )
