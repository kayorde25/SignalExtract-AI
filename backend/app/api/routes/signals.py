from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.core.db import get_session
from app.models.signal import Signal
from app.schemas.review import SignalReviewRequest, SignalReviewResponse
from app.services.audit import audit_event


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/signals")


@router.patch("/{signal_id}/review", response_model=SignalReviewResponse)
def review_signal(
    signal_id: str,
    body: SignalReviewRequest,
    session: Session = Depends(get_session),
) -> SignalReviewResponse:
    sig = session.get(Signal, signal_id)
    if not sig:
        raise HTTPException(status_code=404, detail="Signal not found")

    now = datetime.now(timezone.utc)

    sig.review_status = body.review_status
    sig.reviewed_by = body.reviewed_by
    sig.review_note = body.review_note
    sig.reviewed_at = now
    sig.updated_at = now

    if body.review_status in {"approved", "rejected"}:
        sig.needs_review = False
    else:
        sig.needs_review = True

    session.add(sig)
    session.commit()
    session.refresh(sig)

    event_type = {
        "approved": "signal_approved",
        "rejected": "signal_rejected",
        "needs_clarification": "signal_needs_clarification",
        "pending": "signal_review_reset",
    }[body.review_status]

    audit_event(
        session,
        event_type=event_type,
        entity_type="signal",
        entity_id=sig.id,
        document_id=sig.document_id,
        message=f"Signal review status set to {sig.review_status}",
        actor=body.reviewed_by,
        metadata={"review_note": body.review_note},
    )
    session.commit()

    logger.info("Signal %s reviewed: %s", sig.id, sig.review_status)

    return SignalReviewResponse(
        signal_id=sig.id,
        review_status=sig.review_status,  # type: ignore[arg-type]
        reviewed_by=sig.reviewed_by,
        reviewed_at=sig.reviewed_at,
        review_note=sig.review_note,
        updated_at=sig.updated_at,
    )
