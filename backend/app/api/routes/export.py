from __future__ import annotations

import csv
import io
import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select

from app.core.db import get_session
from app.models.document import Document
from app.models.signal import Signal
from app.services.audit import audit_event


router = APIRouter(prefix="/documents")


@router.get("/{document_id}/export.json")
def export_json(document_id: str, session: Session = Depends(get_session)):
    doc = session.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    signals = session.exec(select(Signal).where(Signal.document_id == doc.id)).all()

    audit_event(
        session,
        event_type="export_generated",
        entity_type="document",
        entity_id=doc.id,
        document_id=doc.id,
        message="Export generated (all signals): json",
        metadata={"format": "json", "scope": "all", "count": len(signals)},
    )
    session.commit()

    payload = [
        {
            "signal_id": s.id,
            "document_id": s.document_id,
            "signal_type": s.signal_type,
            "signal_text": s.signal_text,
            "evidence_text": s.evidence_text,
            "source_document": s.source_document,
            "source_page": s.source_page,
            "source_section": s.source_section,
            "paragraph_id": s.paragraph_id,
            "subject": s.subject,
            "action": s.action,
            "urgency": s.urgency,
            "certainty": s.certainty,
            "explicitness": s.explicitness,
            "confidence": s.confidence,
            "needs_review": s.needs_review,
            "validation_status": s.validation_status,
            "review_status": s.review_status,
            "reviewed_by": s.reviewed_by,
            "reviewed_at": s.reviewed_at.isoformat() if s.reviewed_at else None,
            "review_note": s.review_note,
            "created_at": s.created_at.isoformat(),
            "updated_at": s.updated_at.isoformat(),
        }
        for s in signals
    ]

    return payload


@router.get("/{document_id}/export.csv")
def export_csv(document_id: str, session: Session = Depends(get_session)):
    doc = session.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    signals = session.exec(select(Signal).where(Signal.document_id == doc.id)).all()

    audit_event(
        session,
        event_type="export_generated",
        entity_type="document",
        entity_id=doc.id,
        document_id=doc.id,
        message="Export generated (all signals): csv",
        metadata={"format": "csv", "scope": "all", "count": len(signals)},
    )
    session.commit()

    output = io.StringIO()
    writer = csv.DictWriter(
        output,
        fieldnames=[
            "signal_id",
            "document_id",
            "signal_type",
            "signal_text",
            "evidence_text",
            "source_document",
            "source_page",
            "source_section",
            "paragraph_id",
            "subject",
            "action",
            "urgency",
            "certainty",
            "explicitness",
            "confidence",
            "needs_review",
            "validation_status",
            "review_status",
            "reviewed_by",
            "reviewed_at",
            "review_note",
            "created_at",
            "updated_at",
        ],
    )
    writer.writeheader()

    for s in signals:
        writer.writerow(
            {
                "signal_id": s.id,
                "document_id": s.document_id,
                "signal_type": s.signal_type,
                "signal_text": s.signal_text,
                "evidence_text": s.evidence_text,
                "source_document": s.source_document,
                "source_page": s.source_page,
                "source_section": s.source_section,
                "paragraph_id": s.paragraph_id,
                "subject": s.subject,
                "action": s.action,
                "urgency": s.urgency,
                "certainty": s.certainty,
                "explicitness": s.explicitness,
                "confidence": s.confidence,
                "needs_review": s.needs_review,
                "validation_status": s.validation_status,
                "review_status": s.review_status,
                "reviewed_by": s.reviewed_by,
                "reviewed_at": s.reviewed_at.isoformat() if s.reviewed_at else None,
                "review_note": s.review_note,
                "created_at": s.created_at.isoformat(),
                "updated_at": s.updated_at.isoformat(),
            }
        )

    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=signals_{doc.id}.csv"},
    )


@router.get("/{document_id}/export-approved.json")
def export_approved_json(document_id: str, session: Session = Depends(get_session)):
    doc = session.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    signals = session.exec(
        select(Signal).where(Signal.document_id == doc.id).where(Signal.review_status == "approved")
    ).all()

    audit_event(
        session,
        event_type="export_generated",
        entity_type="document",
        entity_id=doc.id,
        document_id=doc.id,
        message="Export generated (approved signals): json",
        metadata={"format": "json", "scope": "approved", "count": len(signals)},
    )
    session.commit()

    return [
        {
            "signal_id": s.id,
            "document_id": s.document_id,
            "signal_type": s.signal_type,
            "signal_text": s.signal_text,
            "evidence_text": s.evidence_text,
            "source_document": s.source_document,
            "source_page": s.source_page,
            "source_section": s.source_section,
            "paragraph_id": s.paragraph_id,
            "subject": s.subject,
            "action": s.action,
            "urgency": s.urgency,
            "certainty": s.certainty,
            "explicitness": s.explicitness,
            "confidence": s.confidence,
            "needs_review": s.needs_review,
            "validation_status": s.validation_status,
            "review_status": s.review_status,
            "reviewed_by": s.reviewed_by,
            "reviewed_at": s.reviewed_at.isoformat() if s.reviewed_at else None,
            "review_note": s.review_note,
            "created_at": s.created_at.isoformat(),
            "updated_at": s.updated_at.isoformat(),
        }
        for s in signals
    ]


@router.get("/{document_id}/export-approved.csv")
def export_approved_csv(document_id: str, session: Session = Depends(get_session)):
    doc = session.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    signals = session.exec(
        select(Signal).where(Signal.document_id == doc.id).where(Signal.review_status == "approved")
    ).all()

    audit_event(
        session,
        event_type="export_generated",
        entity_type="document",
        entity_id=doc.id,
        document_id=doc.id,
        message="Export generated (approved signals): csv",
        metadata={"format": "csv", "scope": "approved", "count": len(signals)},
    )
    session.commit()

    output = io.StringIO()
    writer = csv.DictWriter(
        output,
        fieldnames=[
            "signal_id",
            "document_id",
            "signal_type",
            "signal_text",
            "evidence_text",
            "source_document",
            "source_page",
            "source_section",
            "paragraph_id",
            "subject",
            "action",
            "urgency",
            "certainty",
            "explicitness",
            "confidence",
            "needs_review",
            "validation_status",
            "review_status",
            "reviewed_by",
            "reviewed_at",
            "review_note",
            "created_at",
            "updated_at",
        ],
    )
    writer.writeheader()

    for s in signals:
        writer.writerow(
            {
                "signal_id": s.id,
                "document_id": s.document_id,
                "signal_type": s.signal_type,
                "signal_text": s.signal_text,
                "evidence_text": s.evidence_text,
                "source_document": s.source_document,
                "source_page": s.source_page,
                "source_section": s.source_section,
                "paragraph_id": s.paragraph_id,
                "subject": s.subject,
                "action": s.action,
                "urgency": s.urgency,
                "certainty": s.certainty,
                "explicitness": s.explicitness,
                "confidence": s.confidence,
                "needs_review": s.needs_review,
                "validation_status": s.validation_status,
                "review_status": s.review_status,
                "reviewed_by": s.reviewed_by,
                "reviewed_at": s.reviewed_at.isoformat() if s.reviewed_at else None,
                "review_note": s.review_note,
                "created_at": s.created_at.isoformat(),
                "updated_at": s.updated_at.isoformat(),
            }
        )

    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=signals_approved_{doc.id}.csv"},
    )
