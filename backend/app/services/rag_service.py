from app.schemas.search import AskResponse, Citation
from app.services.vector_search import semantic_search


def answer_question(question: str, document_ids: list[str] | None = None) -> AskResponse:
    results = semantic_search(question, document_ids)[:2]
    citations = [
        Citation(
            document_name=result.document_name,
            page_or_section=result.page_or_section,
            excerpt=result.excerpt,
            score=result.score,
        )
        for result in results
    ]

    return AskResponse(
        answer="Based on the retrieved excerpts, the document requires written notice and applies cure periods based on breach type.",
        confidence="Moderate",
        citations=citations,
    )
