import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import admin, analysis, auth, documents, search
from app.config import get_settings
from app.database.session import init_db

settings = get_settings()
app = FastAPI(title=settings.app_name, version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://ai-operations-document-intelligence.vercel.app",
        os.getenv("FRONTEND_ORIGIN", "https://ai-operations-document-intelligence.vercel.app"),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["analysis"])
app.include_router(search.router, prefix="/api/search", tags=["search"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])


@app.on_event("startup")
def startup() -> None:
    init_db()


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "healthy"}
