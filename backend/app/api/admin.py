from fastapi import APIRouter

from app.schemas.admin import AuditLogResponse, AdminDocumentResponse, AdminUserResponse

router = APIRouter()


@router.get("/users", response_model=list[AdminUserResponse])
def list_users() -> list[AdminUserResponse]:
    return [AdminUserResponse(id="demo-user", email="admin@aiops.com", role="admin", is_active=True)]


@router.get("/documents", response_model=list[AdminDocumentResponse])
def list_all_documents() -> list[AdminDocumentResponse]:
    return [AdminDocumentResponse(id="demo-document", owner_email="admin@aiops.com", filename="Contract_2024_05_14.pdf", status="processing")]


@router.get("/audit-logs", response_model=list[AuditLogResponse])
def list_audit_logs() -> list[AuditLogResponse]:
    return [AuditLogResponse(id="audit-1", actor_email="admin@aiops.com", action="document.uploaded", metadata={"filename": "Contract_2024_05_14.pdf"})]
