from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


ReviewStatus = Literal["pending", "approved", "rejected", "needs_clarification"]


class SignalReviewRequest(BaseModel):
    review_status: ReviewStatus
    reviewed_by: Optional[str] = Field(default=None, max_length=200)
    review_note: Optional[str] = Field(default=None, max_length=2000)


class SignalReviewResponse(BaseModel):
    signal_id: str
    review_status: ReviewStatus
    reviewed_by: str | None
    reviewed_at: datetime | None
    review_note: str | None
    updated_at: datetime
