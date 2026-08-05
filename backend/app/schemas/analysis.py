from pydantic import BaseModel, Field


class Signal(BaseModel):
    name: str
    value: float = Field(ge=0, le=1)
    explanation: str


class AnalysisResponse(BaseModel):
    document_id: str
    document_type: str
    ai_likelihood: float = Field(ge=0, le=1)
    uncertainty: float = Field(ge=0, le=1)
    confidence: str
    primary_signals: list[Signal]
    caveat: str
