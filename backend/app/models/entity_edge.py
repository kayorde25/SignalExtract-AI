from datetime import datetime
from uuid import uuid4
from sqlmodel import Field, SQLModel


class EntityEdge(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    source_node_id: str = Field(foreign_key="entitynode.id", index=True)
    target_node_id: str = Field(foreign_key="entitynode.id", index=True)
    relationship_type: str  # person_organization | person_location | organization_location
    strength: int = 1       # total co-occurrence count (increments per document)
    document_count: int = 1 # distinct documents where both nodes co-occur
    last_seen_at: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)
