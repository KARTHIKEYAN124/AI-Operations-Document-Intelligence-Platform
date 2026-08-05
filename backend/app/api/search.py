from fastapi import APIRouter

from app.schemas.search import AskRequest, AskResponse, SearchRequest, SearchResult
from app.services.rag_service import answer_question
from app.services.vector_search import semantic_search

router = APIRouter()


@router.post("", response_model=list[SearchResult])
def search_documents(payload: SearchRequest) -> list[SearchResult]:
    return semantic_search(payload.query, payload.document_ids)


@router.post("/ask", response_model=AskResponse)
def ask_document(payload: AskRequest) -> AskResponse:
    return answer_question(payload.question, payload.document_ids)
