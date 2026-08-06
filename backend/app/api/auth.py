from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.entities import AuditLog, User, new_id
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from app.security import create_access_token, get_current_user, hash_password, verify_password

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> UserResponse:
    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Passwords do not match")
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")

    user = User(id=new_id(), email=payload.email.lower(), hashed_password=hash_password(payload.password), role="user", is_active=True)
    db.add(user)
    db.add(AuditLog(id=new_id(), actor_id=user.id, action="user.registered", metadata_json={"email": user.email}))
    db.commit()
    db.refresh(user)
    return to_user_response(user)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(subject=user.id, role=user.role)
    db.add(AuditLog(id=new_id(), actor_id=user.id, action="user.logged_in", metadata_json={"email": user.email}))
    db.commit()
    return TokenResponse(access_token=token, token_type="bearer")


@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)) -> UserResponse:
    return to_user_response(user)


def to_user_response(user: User) -> UserResponse:
    return UserResponse(id=user.id, email=user.email, role=user.role, is_active=user.is_active)
