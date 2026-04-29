from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class ExtractionRunRead(BaseModel):
    extraction_run_id: str
    document_id: str
    status: str
    pipeline_version: str
    error_message: str | None = None
    created_at: datetime


class ChunkRead(BaseModel):
    chunk_id: str
    text: str
    source_page: int | None = None
    source_section: str | None = None
    paragraph_id: str | None = None


class TextExtractionResponse(BaseModel):
    document_id: str
    text: str
    chunks: list[ChunkRead]


class ExtractSignalsResponse(BaseModel):
    document_id: str
    extraction_run: ExtractionRunRead
    signals: list[dict]
