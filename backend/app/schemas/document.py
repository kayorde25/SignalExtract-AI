from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel


class DocumentRead(BaseModel):
    document_id: str
    filename: str
    content_type: str | None = None
    file_ext: str
    size_bytes: int
    sha256: str
    created_at: datetime


class DocumentUploadResponse(BaseModel):
    document: DocumentRead
