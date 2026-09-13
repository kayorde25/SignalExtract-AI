from collections import Counter
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from ...core.db import get_session
from ...core.security import verify_api_key
from ...models.signal import Signal
from ...models.document import Document
from ...schemas.signal import SignalRead, SignalList, SignalSummary
from ...schemas.review import ReviewRequest
from ...services.audit import log_event

router = APIRouter(tags=["signals"])


@router.get("/documents/{document_id}/signals/summary", response_model=SignalSummary)
async def signals_summary(
    document_id: str,
    session: Session = Depends(get_session),
    _: str | None = Depends(verify_api_key),
):
    doc = session.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    signals = session.exec(
        select(Signal).where(Signal.document_id == document_id)
    ).all()
    counts = Counter(s.signal_type for s in signals)
    return SignalSummary(
        dates=counts.get("date", 0),
        money=counts.get("amount", 0),
        percentages=counts.get("percentage", 0),
        emails=counts.get("email", 0),
        phones=counts.get("phone", 0),
        urls=counts.get("url", 0),
        identifiers=counts.get("identifier", 0),
        measurements=counts.get("measurement", 0),
        entities=(
            counts.get("person_name", 0)
            + counts.get("organization", 0)
            + counts.get("location", 0)
        ),
        total=sum(counts.values()),
    )


@router.get("/documents/{document_id}/signals", response_model=SignalList)
async def list_signals(
    document_id: str,
    signal_type: str | None = None,
    review_status: str | None = None,
    session: Session = Depends(get_session),
    _: str | None = Depends(verify_api_key),
):
    stmt = select(Signal).where(Signal.document_id == document_id)
    if signal_type:
        stmt = stmt.where(Signal.signal_type == signal_type)
    if review_status:
        stmt = stmt.where(Signal.review_status == review_status)
    stmt = stmt.order_by(Signal.signal_type, Signal.confidence.desc())
    signals = session.exec(stmt).all()
    return SignalList(items=list(signals), total=len(signals))


@router.patch("/signals/{signal_id}/review", response_model=SignalRead)
async def review_signal(
    signal_id: str,
    body: ReviewRequest,
    session: Session = Depends(get_session),
    _: str | None = Depends(verify_api_key),
):
    signal = session.get(Signal, signal_id)
    if not signal:
        raise HTTPException(status_code=404, detail="Signal not found")

    prev = signal.review_status
    signal.review_status = body.review_status
    signal.reviewed_by = body.reviewed_by
    signal.reviewed_at = datetime.utcnow()
    signal.review_note = body.review_note
    if body.edited_value and body.review_status == "edited":
        signal.value = body.edited_value
    session.add(signal)

    # Keep approved_count in sync
    doc = session.get(Document, signal.document_id)
    if doc:
        approved = session.exec(
            select(Signal).where(
                Signal.document_id == doc.id,
                Signal.review_status == "approved",
            )
        ).all()
        doc.approved_count = len(approved)
        session.add(doc)

    session.commit()
    session.refresh(signal)

    log_event(session, entity_type="signal", entity_id=signal_id, action="reviewed",
              actor=body.reviewed_by, details={"from": prev, "to": body.review_status})
    return signal
