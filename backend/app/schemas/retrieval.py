from typing import Optional
from pydantic import BaseModel


class QueryRequest(BaseModel):
    question: str


class CitationResult(BaseModel):
    chunk_id: str
    chunk_index: int
    page_number: Optional[int]
    text: str
    score: float


class QueryResponse(BaseModel):
    answer: str  # always "" in Phase 3A — filled by LLM in Phase 3B
    citations: list[CitationResult]
