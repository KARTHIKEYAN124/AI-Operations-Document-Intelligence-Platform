from uuid import uuid4

from sqlalchemy.orm import Session

from app.models.entities import Answer, Question, User
from app.schemas.search import AskResponse, Citation
from app.services.vector_search import semantic_search


def answer_question(db: Session, user: User, question: str, document_ids: list[str] | None = None) -> AskResponse:
    results = semantic_search(db, question, document_ids, limit=4)
    citations = [
        Citation(
            document_name=result.document_name,
            page_or_section=result.page_or_section,
            excerpt=result.excerpt,
            score=result.score,
        )
        for result in results
    ]

    if not citations:
        answer = "I could not find a strong matching passage in the uploaded documents."
        confidence = "Low"
    else:
        context = " ".join(citation.excerpt for citation in citations[:2])
        answer = summarize_context(question, context)
        confidence = "High" if citations[0].score >= 0.72 else "Moderate" if citations[0].score >= 0.35 else "Low"

    question_record = Question(id=str(uuid4()), user_id=user.id, document_id=document_ids[0] if document_ids else None, question=question)
    db.add(question_record)
    db.flush()
    db.add(Answer(id=str(uuid4()), question_id=question_record.id, answer=answer, confidence=confidence, citations=[citation.model_dump() for citation in citations]))
    db.commit()

    return AskResponse(answer=answer, confidence=confidence, citations=citations)


def summarize_context(question: str, context: str) -> str:
    clean = " ".join(context.split())
    excerpt = clean[:650].rstrip()
    return f"Based on the retrieved document passages, {excerpt}"
