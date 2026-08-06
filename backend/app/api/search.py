from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.entities import Document, User
from app.schemas.search import AskRequest, AskResponse, SearchRequest, SearchResult
from app.security import get_current_user
from app.services.rag_service import answer_question
from app.services.vector_search import semantic_search

router = APIRouter()


@router.post("", response_model=list[SearchResult])
def search_documents(payload: SearchRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[SearchResult]:
    document_ids = payload.document_ids or [row[0] for row in db.query(Document.id).filter(Document.owner_id == user.id).all()]
    return semantic_search(db, payload.query, document_ids)


@router.post("/ask", response_model=AskResponse)
def ask_document(payload: AskRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> AskResponse:
    document_ids = payload.document_ids or [row[0] for row in db.query(Document.id).filter(Document.owner_id == user.id).all()]
    return answer_question(db, user, payload.question, document_ids)
