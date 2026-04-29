from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel


SignalType = Literal[
    "finding",
    "recommendation",
    "action",
    "risk",
    "clinical_statement",
    "operational_statement",
]

Explicitness = Literal["explicit", "implied"]

ReviewStatus = Literal["pending", "approved", "rejected", "needs_clarification"]
ValidationStatus = Literal["ok", "evidence_missing", "evidence_weak", "evidence_mismatch"]


class SignalRead(BaseModel):
    # Field names intentionally match the product spec for easy auditing/export.
    signal_id: str
    document_id: str

    signal_type: SignalType
    signal_text: str
    evidence_text: str

    source_document: str
    source_page: int | None = None
    source_section: str | None = None
    paragraph_id: str | None = None

    subject: str | None = None
    action: str | None = None
    urgency: str | None = None
    certainty: str | None = None
    explicitness: Explicitness

    confidence: float
    needs_review: bool

    validation_status: ValidationStatus

    review_status: ReviewStatus
    reviewed_by: str | None = None
    reviewed_at: datetime | None = None
    review_note: str | None = None

    created_at: datetime
    updated_at: datetime


class SignalListResponse(BaseModel):
    document_id: str
    signals: list[SignalRead]
