# AI Operations & Document Intelligence Platform

A full-stack document intelligence platform for uploading files, extracting text, analyzing writing style, searching documents semantically, and answering questions with retrieval-augmented generation.

AI-writing analysis is reported as a likelihood estimate with explanatory signals and uncertainty. It is not presented as a definitive detector.

## Primary Workflow

1. Upload PDF, DOCX, TXT, Markdown, or image files.
2. Validate MIME type, size, corruption, emptiness, and duplicate hashes.
3. Extract text and metadata.
4. Store the document record and processing job.
5. Analyze document type, key information, and writing-style signals.
6. Chunk text and generate embeddings.
7. Store vectors in Qdrant.
8. Display report, search results, history, and analytics.

## Implemented Stack

- Frontend: Next.js, TypeScript, Tailwind CSS, shadcn-style primitives, SWR, Recharts
- Backend: FastAPI, SQLAlchemy, JWT auth, password hashing, Docker
- Persistence: PostgreSQL through `DATABASE_URL`, with SQLite fallback for local development and tests
- Async infrastructure: Redis/Celery-ready worker configuration
- Search and AI: deterministic local embeddings, optional Qdrant vector upsert, retrieval-based Q&A
- Deployment: Vercel frontend is live; backend is containerized for Railway/Render with managed PostgreSQL, Redis, and Qdrant

## Repository Layout

```text
frontend/          Next.js app with live upload, analysis, search, Q&A, auth forms, history, and admin UI
backend/           FastAPI app with auth, documents, analysis, search, admin, services, models, and tests
docs/              Wireframes, API list, entity diagram, and project board
docker-compose.yml Local PostgreSQL, Redis, Qdrant, and backend stack
```

## Quick Start

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Backend:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Full local stack:

```bash
docker compose up --build
```

Frontend connected to FastAPI:

```bash
cd frontend
set NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
npm run dev
```

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string. Defaults to local SQLite.
- `JWT_SECRET_KEY`: secret used to sign access tokens.
- `ADMIN_EMAIL`: seeded admin email. Defaults to `admin@aiops.com`.
- `ADMIN_PASSWORD`: seeded admin password. Defaults to `Admin@123`.
- `REDIS_URL`: Redis broker URL for Celery workers.
- `QDRANT_URL`: Qdrant endpoint for vector upserts.
- `QDRANT_API_KEY`: optional Qdrant Cloud key.
- `NEXT_PUBLIC_API_BASE_URL`: frontend URL for the FastAPI backend.

## Verification

```bash
cd backend
python -m pytest

cd ../frontend
npm run typecheck
npm run build
```

## Notes

AI-writing analysis is intentionally probabilistic. The app reports likelihood, confidence, uncertainty, and primary writing-style signals instead of presenting a yes/no detector.

Browser OCR is available in the deployed frontend for scanned PDFs/images. Backend OCR uses an optional Tesseract adapter when the host image includes Tesseract.
