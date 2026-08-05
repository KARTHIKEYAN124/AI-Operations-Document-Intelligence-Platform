from pydantic import BaseModel, EmailStr


class AdminUserResponse(BaseModel):
    id: str
    email: EmailStr
    role: str
    is_active: bool


class AdminDocumentResponse(BaseModel):
    id: str
    owner_email: EmailStr
    filename: str
    status: str


class AuditLogResponse(BaseModel):
    id: str
    actor_email: EmailStr
    action: str
    metadata: dict
