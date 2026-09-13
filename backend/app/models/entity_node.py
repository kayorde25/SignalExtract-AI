from datetime import datetime
from uuid import uuid4
from sqlmodel import Field, SQLModel


class EntityNode(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    entity_type: str       # person_name | organization | location
    entity_value: str      # canonical display value (first-seen casing)
    normalized_value: str = Field(index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
