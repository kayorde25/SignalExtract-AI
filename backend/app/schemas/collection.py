from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class CollectionCreate(BaseModel):
    name: str
    description: Optional[str] = None


class CollectionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class CollectionResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class CollectionDocumentRef(BaseModel):
    id: str
    filename: str
    status: str
    signal_count: int


class CollectionDetailResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    document_count: int
    signal_count: int
    entity_count: int
    documents: list[CollectionDocumentRef]


class CollectionList(BaseModel):
    items: list[CollectionResponse]
    total: int


class AddDocumentRequest(BaseModel):
    document_id: str


# Stub for future collection-aware chat — no endpoint yet
class CollectionQueryRequest(BaseModel):
    collection_id: str
    question: str
