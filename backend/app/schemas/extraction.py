from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class ExtractionRunRead(BaseModel):
    id: str
    document_id: str
    run_type: str
    mode: Optional[str] = None
    status: str
    signal_count: int
    error_message: Optional[str] = None
    started_at: datetime
    completed_at: Optional[datetime] = None
    duration_ms: Optional[int] = None

    model_config = {"from_attributes": True}
