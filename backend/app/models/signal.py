from datetime import datetime
from typing import Optional
from uuid import uuid4
from sqlmodel import Field, SQLModel


class Signal(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    document_id: str = Field(foreign_key="document.id", index=True)
    extraction_run_id: str = Field(foreign_key="extractionrun.id", index=True)
    signal_type: str  # date|amount|percentage|email|phone|url|identifier|measurement|person_name|organization|location|other
    value: str
    evidence: str  # verbatim source snippet
    confidence: float = 1.0
    page_number: Optional[int] = None
    char_offset_start: Optional[int] = None
    char_offset_end: Optional[int] = None
    review_status: str = "pending"  # pending|approved|rejected|edited
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    review_note: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
