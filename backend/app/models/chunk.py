from datetime import datetime
from typing import Optional
from uuid import uuid4
from sqlmodel import Field, SQLModel, Column, Text


class DocumentChunk(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    document_id: str = Field(foreign_key="document.id", index=True)
    chunk_index: int
    text: str = Field(sa_column=Column(Text))
    char_offset_start: int
    char_offset_end: int
    page_number: Optional[int] = None
    embedding_json: Optional[str] = Field(default=None, sa_column=Column(Text))
    embedding_model: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
