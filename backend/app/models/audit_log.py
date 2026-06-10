from datetime import datetime
from typing import Optional
from uuid import uuid4
from sqlmodel import Field, SQLModel, Column, Text


class AuditLog(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    entity_type: str
    entity_id: str = Field(index=True)
    action: str
    actor: Optional[str] = None
    details: Optional[str] = Field(default=None, sa_column=Column(Text))
    timestamp: datetime = Field(default_factory=datetime.utcnow)
