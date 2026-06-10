from datetime import datetime
from typing import Optional
from uuid import uuid4
from sqlmodel import Field, SQLModel, Column, Text


class Document(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    filename: str  # stored file path
    original_filename: str
    content_type: str
    file_size: int
    status: str = "uploaded"  # uploaded|extracting_text|text_ready|extracting_signals|done|error
    text_content: Optional[str] = Field(default=None, sa_column=Column(Text))
    error_message: Optional[str] = None
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    signal_count: int = 0
    approved_count: int = 0
    page_count: Optional[int] = None
    char_count: Optional[int] = None
    extraction_mode: Optional[str] = None
