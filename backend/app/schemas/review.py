from typing import Optional
from pydantic import BaseModel, field_validator

_VALID = {"approved", "rejected", "edited"}


class ReviewRequest(BaseModel):
    review_status: str
    reviewed_by: Optional[str] = None
    review_note: Optional[str] = None
    edited_value: Optional[str] = None

    @field_validator("review_status")
    @classmethod
    def check_status(cls, v: str) -> str:
        if v not in _VALID:
            raise ValueError(f"review_status must be one of {_VALID}")
        return v
