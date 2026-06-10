import csv
import io
import json
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlmodel import Session, select
from ...core.db import get_session
from ...core.security import verify_api_key
from ...models.signal import Signal
from ...models.document import Document

router = APIRouter(prefix="/documents", tags=["export"])

_CSV_FIELDS = ["id", "signal_type", "value", "evidence", "confidence",
               "review_status", "reviewed_by", "review_note"]


def _fetch(document_id: str, session: Session, approved_only: bool):
    doc = session.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    stmt = select(Signal).where(Signal.document_id == document_id)
    if approved_only:
        stmt = stmt.where(Signal.review_status.in_(["approved", "edited"]))
    return doc, session.exec(stmt.order_by(Signal.signal_type)).all()


@router.get("/{document_id}/export.json")
async def export_json(
    document_id: str,
    approved_only: bool = False,
    session: Session = Depends(get_session),
    _: str | None = Depends(verify_api_key),
):
    doc, signals = _fetch(document_id, session, approved_only)
    payload = {
        "document": {
            "id": doc.id,
            "filename": doc.original_filename,
            "uploaded_at": doc.uploaded_at.isoformat(),
            "extraction_mode": doc.extraction_mode,
        },
        "signals": [
            {
                "id": s.id,
                "type": s.signal_type,
                "value": s.value,
                "evidence": s.evidence,
                "confidence": s.confidence,
                "review_status": s.review_status,
                "reviewed_by": s.reviewed_by,
                "review_note": s.review_note,
            }
            for s in signals
        ],
    }
    return Response(
        content=json.dumps(payload, indent=2, default=str),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{doc.original_filename}.signals.json"'},
    )


@router.get("/{document_id}/export.csv")
async def export_csv(
    document_id: str,
    approved_only: bool = False,
    session: Session = Depends(get_session),
    _: str | None = Depends(verify_api_key),
):
    doc, signals = _fetch(document_id, session, approved_only)
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=_CSV_FIELDS)
    w.writeheader()
    for s in signals:
        w.writerow({
            "id": s.id, "signal_type": s.signal_type, "value": s.value,
            "evidence": s.evidence, "confidence": s.confidence,
            "review_status": s.review_status,
            "reviewed_by": s.reviewed_by or "", "review_note": s.review_note or "",
        })
    return Response(
        content=buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{doc.original_filename}.signals.csv"'},
    )
