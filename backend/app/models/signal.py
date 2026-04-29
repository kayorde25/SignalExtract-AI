from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from sqlmodel import SQLModel, Field


class Signal(SQLModel, table=True):
    """A single extracted signal with evidence.

    Core principle: auditable outputs. `signal_text` is the normalized statement
    and `evidence_text` is the verbatim supporting snippet from the source.
    """

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)

    document_id: str = Field(foreign_key="document.id", index=True)
    extraction_run_id: str = Field(foreign_key="extractionrun.id", index=True)

    signal_type: str = Field(index=True)

    signal_text: str
    evidence_text: str

    source_document: str
    source_page: Optional[int] = None
    source_section: Optional[str] = None
    paragraph_id: Optional[str] = None

    subject: Optional[str] = None
    action: Optional[str] = None
    urgency: Optional[str] = None
    certainty: Optional[str] = None
    explicitness: str

    confidence: float
    needs_review: bool = False

    # Evidence validation
    validation_status: str = Field(default="ok", index=True)

    # Human-in-the-loop review
    review_status: str = Field(default="pending", index=True)  # pending|approved|rejected|needs_clarification
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    review_note: Optional[str] = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), index=True)
