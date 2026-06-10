from fastapi import APIRouter, Depends
from sqlmodel import Session, select, func
from ...core.db import get_session
from ...core.security import verify_api_key
from ...models.document import Document
from ...models.signal import Signal

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/")
async def get_stats(
    session: Session = Depends(get_session),
    _: str | None = Depends(verify_api_key),
):
    total_docs = session.exec(select(func.count()).select_from(Document)).one()
    docs_done = session.exec(
        select(func.count()).select_from(Document).where(Document.status == "done")
    ).one()
    total_signals = session.exec(select(func.count()).select_from(Signal)).one()
    approved = session.exec(
        select(func.count()).select_from(Signal).where(Signal.review_status == "approved")
    ).one()
    rejected = session.exec(
        select(func.count()).select_from(Signal).where(Signal.review_status == "rejected")
    ).one()
    pending = session.exec(
        select(func.count()).select_from(Signal).where(Signal.review_status == "pending")
    ).one()
    avg_conf = session.exec(select(func.avg(Signal.confidence))).one() or 0.0

    return {
        "total_documents": total_docs,
        "documents_done": docs_done,
        "total_signals": total_signals,
        "approved_signals": approved,
        "rejected_signals": rejected,
        "pending_signals": pending,
        "approval_rate": round(approved / total_signals, 3) if total_signals else 0.0,
        "avg_confidence": round(avg_conf, 3),
    }
