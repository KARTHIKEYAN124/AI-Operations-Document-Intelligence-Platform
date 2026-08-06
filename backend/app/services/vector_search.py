from sqlalchemy.orm import Session

from app.models.entities import Document, DocumentChunk
from app.schemas.search import SearchResult
from app.services.embeddings import cosine_similarity, embed_text


def semantic_search(db: Session, query: str, document_ids: list[str] | None = None, limit: int = 8) -> list[SearchResult]:
    query_vector = embed_text(query)
    chunk_query = db.query(DocumentChunk, Document).join(Document, Document.id == DocumentChunk.document_id)
    if document_ids:
        chunk_query = chunk_query.filter(DocumentChunk.document_id.in_(document_ids))

    scored: list[SearchResult] = []
    for chunk, document in chunk_query.all():
        vector_score = cosine_similarity(query_vector, chunk.embedding or [])
        keyword_score = keyword_overlap(query, chunk.text)
        score = round((vector_score * 0.7) + (keyword_score * 0.3), 4)
        if score <= 0:
            continue
        scored.append(
            SearchResult(
                document_id=document.id,
                document_name=document.filename,
                page_or_section=chunk.section or f"Chunk {chunk.chunk_index + 1}",
                excerpt=chunk.text[:700],
                score=score,
            )
        )

    return sorted(scored, key=lambda result: result.score, reverse=True)[:limit]


def keyword_overlap(query: str, text: str) -> float:
    query_terms = {term.lower() for term in query.split() if len(term) > 2}
    if not query_terms:
        return 0.0
    text_terms = {term.lower().strip(".,:;()[]{}\"'") for term in text.split()}
    return len(query_terms & text_terms) / len(query_terms)
