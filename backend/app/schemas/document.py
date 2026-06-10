from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class DocumentRead(BaseModel):
    id: str
    filename: str
    original_filename: str
    content_type: str
    file_size: int
    status: str
    error_message: Optional[str] = None
    uploaded_at: datetime
    updated_at: datetime
    signal_count: int
    approved_count: int
    page_count: Optional[int] = None
    char_count: Optional[int] = None
    extraction_mode: Optional[str] = None

    model_config = {"from_attributes": True}


class DocumentList(BaseModel):
    items: list[DocumentRead]
    total: int
