from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from passlib.context import CryptContext

from app.config import get_settings
from app.models.entities import Base, User

settings = get_settings()
password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, pool_pre_ping=True, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        admin = db.query(User).filter(User.email == settings.admin_email).first()
        if not admin:
            db.add(
                User(
                    email=settings.admin_email,
                    hashed_password=password_context.hash(settings.admin_password),
                    role="admin",
                    is_active=True,
                )
            )
            db.commit()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
