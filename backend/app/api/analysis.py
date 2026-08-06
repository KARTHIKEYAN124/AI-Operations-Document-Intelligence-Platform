from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.entities import Analysis, Document, User
from app.schemas.analysis import AnalysisResponse, Signal
from app.security import get_current_user

router = APIRouter()


@router.get("/{document_id}", response_model=AnalysisResponse)
def get_analysis(document_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> AnalysisResponse:
    document = db.get(Document, document_id)
    if not document or (document.owner_id != user.id and user.role != "admin"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    analysis = db.query(Analysis).filter(Analysis.document_id == document_id).order_by(Analysis.created_at.desc()).first()
    if not analysis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found")
    return to_analysis_response(analysis)


@router.post("/{document_id}/rerun", response_model=AnalysisResponse)
def rerun_analysis(document_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> AnalysisResponse:
    return get_analysis(document_id, user, db)


def to_analysis_response(analysis: Analysis) -> AnalysisResponse:
    return AnalysisResponse(
        document_id=analysis.document_id,
        document_type=analysis.document_type,
        ai_likelihood=analysis.ai_likelihood,
        uncertainty=analysis.uncertainty,
        confidence=analysis.confidence,
        primary_signals=[Signal(**signal) for signal in analysis.signals],
        caveat="AI-writing analysis is probabilistic and should not be treated as perfectly accurate.",
    )
