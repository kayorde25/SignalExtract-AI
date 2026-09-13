from typing import Literal, Optional
from pydantic import BaseModel


class DiffToken(BaseModel):
    text: str
    type: Literal["equal", "added", "removed"]


class ChunkChange(BaseModel):
    type: Literal["added", "removed", "modified", "unchanged"]
    chunk_index_a: Optional[int] = None
    chunk_index_b: Optional[int] = None
    text_a: Optional[str] = None
    text_b: Optional[str] = None
    diff_tokens: Optional[list[DiffToken]] = None


class SignalChange(BaseModel):
    signal_type: str
    change_type: Literal["added", "removed", "changed"]
    value: Optional[str] = None
    value_a: Optional[str] = None
    value_b: Optional[str] = None
    document: Optional[Literal["a", "b"]] = None
    evidence: str
    evidence_b: Optional[str] = None
    page_number: Optional[int] = None


class ComparisonSummary(BaseModel):
    added_chunks: int = 0
    removed_chunks: int = 0
    modified_chunks: int = 0
    unchanged_chunks: int = 0
    added_signals: int = 0
    removed_signals: int = 0
    changed_signals: int = 0
    added_entities: int = 0
    removed_entities: int = 0
    changed_entities: int = 0


class DocumentRef(BaseModel):
    id: str
    filename: str
    page_count: Optional[int] = None
    signal_count: int = 0


class CompareRequest(BaseModel):
    document_a: str
    document_b: str


class CompareResponse(BaseModel):
    document_a: DocumentRef
    document_b: DocumentRef
    summary: ComparisonSummary
    chunk_changes: list[ChunkChange]
    signal_changes: list[SignalChange]
    entity_changes: list[SignalChange]
