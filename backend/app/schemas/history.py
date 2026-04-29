from __future__ import annotations

from pydantic import BaseModel

from .document import DocumentRead
from .extraction import ExtractionRunRead


class HistoryResponse(BaseModel):
    documents: list[DocumentRead]
    extraction_runs: list[ExtractionRunRead]
