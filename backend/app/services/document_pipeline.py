from uuid import uuid4

from sqlalchemy.orm import Session

from app.models.entities import Analysis, AuditLog, Document, DocumentChunk, ProcessingJob, User
from app.services.ai_detector import classify_document, estimate_ai_likelihood, extract_key_information
from app.services.chunking import chunk_text
from app.services.document_parser import extract_text
from app.services.embeddings import embed_texts
from app.services.qdrant_store import upsert_chunks


def process_document(db: Session, document: Document, content: bytes, actor: User) -> Analysis:
    job = ProcessingJob(id=str(uuid4()), document_id=document.id, status="processing", progress=20)
    db.add(job)
    db.commit()

    extracted_text, limitations, page_count = extract_text(document.filename, content, document.mime_type)
    if not extracted_text.strip():
        document.status = "needs_review"
        job.status = "needs_review"
        job.progress = 100
        analysis = Analysis(
            id=str(uuid4()),
            document_id=document.id,
            document_type="Unknown / text unavailable",
            ai_likelihood=0,
            uncertainty=1,
            confidence="Low",
            signals=[],
            extracted_fields={"limitations": limitations, "word_count": 0},
        )
        db.add(analysis)
        db.add(AuditLog(id=str(uuid4()), actor_id=actor.id, action="document.needs_review", metadata_json={"filename": document.filename}))
        db.commit()
        db.refresh(analysis)
        return analysis

    chunks = chunk_text(extracted_text)
    vectors = embed_texts([chunk.text for chunk in chunks])
    upsert_chunks(document.id, [(chunk.index, chunk.text, vector) for chunk, vector in zip(chunks, vectors)])
    for chunk, vector in zip(chunks, vectors):
        db.add(
            DocumentChunk(
                id=str(uuid4()),
                document_id=document.id,
                chunk_index=chunk.index,
                page_number=None,
                section=f"Chunk {chunk.index + 1}",
                text=chunk.text,
                embedding=vector,
                vector_id=f"{document.id}:{chunk.index}",
            )
        )

    ai_report = estimate_ai_likelihood(document.id, extracted_text)
    analysis = Analysis(
        id=str(uuid4()),
        document_id=document.id,
        document_type=classify_document(document.filename, extracted_text),
        ai_likelihood=ai_report.ai_likelihood,
        uncertainty=ai_report.uncertainty,
        confidence=ai_report.confidence,
        signals=[signal.model_dump() for signal in ai_report.primary_signals],
        extracted_fields={**extract_key_information(document.filename, extracted_text), "limitations": limitations, "word_count": len(extracted_text.split())},
    )
    document.status = "ready"
    document.page_count = page_count
    job.status = "complete"
    job.progress = 100
    db.add(analysis)
    db.add(AuditLog(id=str(uuid4()), actor_id=actor.id, action="document.processed", metadata_json={"filename": document.filename, "chunks": len(chunks)}))
    db.commit()
    db.refresh(analysis)
    return analysis
