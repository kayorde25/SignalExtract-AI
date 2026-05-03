from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlmodel import Session, select

from app.core.db import get_session
from app.models.document import Document
from app.models.extraction_run import ExtractionRun
from app.models.signal import Signal


router = APIRouter()


def _count(session: Session, stmt) -> int:
    return int(session.exec(stmt).one())


@router.get("/stats")
def stats(session: Session = Depends(get_session)) -> dict:
    documents_total = _count(session, select(func.count()).select_from(Document))
    extraction_runs_total = _count(session, select(func.count()).select_from(ExtractionRun))
    signals_total = _count(session, select(func.count()).select_from(Signal))

    needs_review = _count(session, select(func.count()).select_from(Signal).where(Signal.needs_review == True))  # noqa: E712

    approved = _count(
        session,
        select(func.count()).select_from(Signal).where(Signal.review_status == "approved"),
    )
    rejected = _count(
        session,
        select(func.count()).select_from(Signal).where(Signal.review_status == "rejected"),
    )
    needs_clarification = _count(
        session,
        select(func.count()).select_from(Signal).where(Signal.review_status == "needs_clarification"),
    )
    pending = _count(
        session,
        select(func.count()).select_from(Signal).where(Signal.review_status == "pending"),
    )

    return {
        "documents_total": documents_total,
        "extraction_runs_total": extraction_runs_total,
        "signals_total": signals_total,
        "signals_needing_review": needs_review,
        "signals_by_review_status": {
            "approved": approved,
            "rejected": rejected,
            "needs_clarification": needs_clarification,
            "pending": pending,
        },
    }
