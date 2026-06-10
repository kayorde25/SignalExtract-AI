from datetime import datetime
from typing import Optional
from uuid import uuid4
from sqlmodel import Field, SQLModel


class ExtractionRun(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    document_id: str = Field(foreign_key="document.id", index=True)
    run_type: str  # text|signals
    mode: Optional[str] = None  # rule_based|llm|hybrid
    status: str = "pending"  # pending|running|done|error
    signal_count: int = 0
    error_message: Optional[str] = None
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    duration_ms: Optional[int] = None
