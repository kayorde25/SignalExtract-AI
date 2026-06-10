from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class SignalRead(BaseModel):
    id: str
    document_id: str
    extraction_run_id: str
    signal_type: str
    value: str
    evidence: str
    confidence: float
    page_number: Optional[int] = None
    char_offset_start: Optional[int] = None
    char_offset_end: Optional[int] = None
    review_status: str
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    review_note: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SignalList(BaseModel):
    items: list[SignalRead]
    total: int
