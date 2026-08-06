from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.entities import AuditLog, Document, User
from app.schemas.admin import AuditLogResponse, AdminDocumentResponse, AdminUserResponse
from app.security import require_admin

router = APIRouter()


@router.get("/users", response_model=list[AdminUserResponse])
def list_users(_: User = Depends(require_admin), db: Session = Depends(get_db)) -> list[AdminUserResponse]:
    return [AdminUserResponse(id=user.id, email=user.email, role=user.role, is_active=user.is_active) for user in db.query(User).order_by(User.created_at.desc()).all()]


@router.get("/documents", response_model=list[AdminDocumentResponse])
def list_all_documents(_: User = Depends(require_admin), db: Session = Depends(get_db)) -> list[AdminDocumentResponse]:
    rows = db.query(Document, User).join(User, User.id == Document.owner_id).order_by(Document.created_at.desc()).all()
    return [AdminDocumentResponse(id=document.id, owner_email=owner.email, filename=document.filename, status=document.status) for document, owner in rows]


@router.get("/audit-logs", response_model=list[AuditLogResponse])
def list_audit_logs(_: User = Depends(require_admin), db: Session = Depends(get_db)) -> list[AuditLogResponse]:
    rows = db.query(AuditLog, User).outerjoin(User, User.id == AuditLog.actor_id).order_by(AuditLog.created_at.desc()).limit(100).all()
    return [
        AuditLogResponse(
            id=log.id,
            actor_email=actor.email if actor else "system@aiops.com",
            action=log.action,
            metadata=log.metadata_json,
        )
        for log, actor in rows
    ]
