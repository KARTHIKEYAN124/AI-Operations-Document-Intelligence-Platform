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

## Tech Stack

- Frontend: Next.js, TypeScript, Tailwind CSS, shadcn-style primitives, SWR, Recharts
- Backend: FastAPI, PostgreSQL, SQLAlchemy, Redis, Celery-ready background tasks
- Search and AI: Qdrant, OpenAI-compatible embeddings or local embedding adapters
- Deployment: Vercel for frontend, Railway or Render for backend, managed PostgreSQL, Redis, and Qdrant Cloud

## Repository Layout

```text
frontend/          Next.js app with static, typed product workflows
backend/           FastAPI app with API modules, schemas, services, and tests
docs/              Wireframes, API list, entity diagram, and project board
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

## Project Phases

The initial implementation covers Phase 1 and a static Phase 2 frontend, plus backend module scaffolding for Phases 3-7. Tests are stubbed for parsing, chunking, authentication, and upload validation.
