from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    query: str = Field(min_length=1)
    document_ids: list[str] | None = None


class SearchResult(BaseModel):
    document_id: str
    document_name: str
    page_or_section: str
    excerpt: str
    score: float


class AskRequest(BaseModel):
    question: str = Field(min_length=1)
    document_ids: list[str] | None = None


class Citation(BaseModel):
    document_name: str
    page_or_section: str
    excerpt: str
    score: float


class AskResponse(BaseModel):
    answer: str
    confidence: str
    citations: list[Citation]
