from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from sqlmodel import SQLModel, Field


class ExtractionRun(SQLModel, table=True):
    """One execution of the extraction pipeline for a document."""

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)

    document_id: str = Field(foreign_key="document.id", index=True)

    status: str = "completed"  # keep simple; could be "queued"/"running"/"failed"
    pipeline_version: str = "v1"
    error_message: Optional[str] = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
