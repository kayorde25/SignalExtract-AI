from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from sqlmodel import SQLModel, Field


class Document(SQLModel, table=True):
    """Uploaded document metadata.

    We store the raw file on disk (or future object storage) and keep only the
    metadata + pointers in the DB.
    """

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)

    filename: str
    content_type: Optional[str] = None
    file_ext: str

    storage_path: str
    sha256: str
    size_bytes: int

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
