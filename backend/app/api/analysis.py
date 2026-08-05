from fastapi import APIRouter

from app.schemas.analysis import AnalysisResponse
from app.services.ai_detector import estimate_ai_likelihood

router = APIRouter()


@router.get("/{document_id}", response_model=AnalysisResponse)
def get_analysis(document_id: str) -> AnalysisResponse:
    return estimate_ai_likelihood(document_id=document_id, text=DEMO_TEXT)


@router.post("/{document_id}/rerun", response_model=AnalysisResponse)
def rerun_analysis(document_id: str) -> AnalysisResponse:
    return estimate_ai_likelihood(document_id=document_id, text=DEMO_TEXT)


DEMO_TEXT = (
    "This document provides a structured overview of contractual obligations. "
    "The writing uses consistent transitions and predictable paragraph structure."
)
