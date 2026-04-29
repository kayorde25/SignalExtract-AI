from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.core.db import get_session
from app.models.document import Document
from app.models.extraction_run import ExtractionRun
from app.models.signal import Signal
from app.schemas.extraction import TextExtractionResponse, ChunkRead, ExtractionRunRead
from app.schemas.signal import SignalListResponse, SignalRead
from app.services.pipeline import run_pipeline
from app.services.audit import audit_event


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/documents")


def _to_run_read(run: ExtractionRun) -> ExtractionRunRead:
    return ExtractionRunRead(
        extraction_run_id=run.id,
        document_id=run.document_id,
        status=run.status,
        pipeline_version=run.pipeline_version,
        error_message=run.error_message,
        created_at=run.created_at,
    )


def _to_signal_read(sig: Signal) -> SignalRead:
    return SignalRead(
        signal_id=sig.id,
        document_id=sig.document_id,
        signal_type=sig.signal_type,  # type: ignore[arg-type]
        signal_text=sig.signal_text,
        evidence_text=sig.evidence_text,
        source_document=sig.source_document,
        source_page=sig.source_page,
        source_section=sig.source_section,
        paragraph_id=sig.paragraph_id,
        subject=sig.subject,
        action=sig.action,
        urgency=sig.urgency,
        certainty=sig.certainty,
        explicitness=sig.explicitness,  # type: ignore[arg-type]
        confidence=sig.confidence,
        needs_review=sig.needs_review,
        validation_status=sig.validation_status,  # type: ignore[arg-type]
        review_status=sig.review_status,  # type: ignore[arg-type]
        reviewed_by=sig.reviewed_by,
        reviewed_at=sig.reviewed_at,
        review_note=sig.review_note,
        created_at=sig.created_at,
        updated_at=sig.updated_at,
    )


@router.post("/{document_id}/extract-text", response_model=TextExtractionResponse)
def extract_text_only(document_id: str, session: Session = Depends(get_session)) -> TextExtractionResponse:
    """Extract verbatim text and return structure-aware chunks."""

    doc = session.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        text, chunks, _signals = run_pipeline(doc.storage_path, source_document=doc.filename)
    except ValueError as e:
        message = str(e)
        if message.startswith("Unsupported file type"):
            raise HTTPException(status_code=415, detail=message)
        raise HTTPException(status_code=422, detail=message)
    except Exception as e:
        logger.exception("Text extraction failed")
        audit_event(
            session,
            event_type="extraction_failed",
            entity_type="document",
            entity_id=doc.id,
            document_id=doc.id,
            message="Text extraction failed",
            metadata={"stage": "text", "error": str(e)},
        )
        session.commit()
        raise HTTPException(status_code=500, detail="Text extraction failed")

    audit_event(
        session,
        event_type="text_extracted",
        entity_type="document",
        entity_id=doc.id,
        document_id=doc.id,
        message="Text extracted",
        metadata={"chunks": len(chunks)},
    )
    session.commit()

    return TextExtractionResponse(
        document_id=doc.id,
        text=text,
        chunks=[ChunkRead(**c) for c in chunks],
    )


@router.post("/{document_id}/extract-signals", response_model=SignalListResponse)
def extract_and_store_signals(document_id: str, session: Session = Depends(get_session)) -> SignalListResponse:
    """Run the full extraction pipeline and persist results."""

    doc = session.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    run = ExtractionRun(document_id=doc.id)
    session.add(run)
    session.commit()
    session.refresh(run)

    try:
        _text, _chunks, signals = run_pipeline(doc.storage_path, source_document=doc.filename)

        db_signals: list[Signal] = []
        for s in signals:
            db_signals.append(
                Signal(
                    document_id=doc.id,
                    extraction_run_id=run.id,
                    signal_type=s["signal_type"],
                    signal_text=s["signal_text"],
                    evidence_text=s["evidence_text"],
                    source_document=doc.filename,
                    source_page=s.get("source_page"),
                    source_section=s.get("source_section"),
                    paragraph_id=s.get("paragraph_id"),
                    subject=s.get("subject"),
                    action=s.get("action"),
                    urgency=s.get("urgency"),
                    certainty=s.get("certainty"),
                    explicitness=s["explicitness"],
                    confidence=float(s["confidence"]),
                    needs_review=bool(s["needs_review"]),
                    validation_status=s.get("validation_status", "ok"),
                    created_at=s["created_at"],
                    updated_at=s["created_at"],
                )
            )

        session.add_all(db_signals)
        session.commit()

        audit_event(
            session,
            event_type="signals_extracted",
            entity_type="document",
            entity_id=doc.id,
            document_id=doc.id,
            message=f"Signals extracted: {len(db_signals)}",
            metadata={"count": len(db_signals), "extraction_run_id": run.id},
        )
        session.commit()

        logger.info("Extracted %d signals for document %s", len(db_signals), doc.id)

    except ValueError as e:
        # User-facing extraction issues (unsupported type, empty/no-text docs, etc.)
        message = str(e)
        run.status = "failed"
        run.error_message = message
        session.add(run)
        session.commit()

        audit_event(
            session,
            event_type="extraction_failed",
            entity_type="extraction_run",
            entity_id=run.id,
            document_id=doc.id,
            message="Signal extraction failed",
            metadata={"error": message, "stage": "signals"},
        )
        session.commit()

        if message.startswith("Unsupported file type"):
            raise HTTPException(status_code=415, detail=message)
        raise HTTPException(status_code=422, detail=message)

    except Exception:
        logger.exception("Signal extraction failed")
        run.status = "failed"
        run.error_message = "Signal extraction failed"
        session.add(run)
        session.commit()
        audit_event(
            session,
            event_type="extraction_failed",
            entity_type="extraction_run",
            entity_id=run.id,
            document_id=doc.id,
            message="Signal extraction failed",
            metadata={"error": "Signal extraction failed", "stage": "signals"},
        )
        session.commit()
        raise HTTPException(status_code=500, detail="Signal extraction failed")

    stored = session.exec(select(Signal).where(Signal.extraction_run_id == run.id)).all()

    return SignalListResponse(document_id=doc.id, signals=[_to_signal_read(s) for s in stored])


@router.get("/{document_id}/signals", response_model=SignalListResponse)
def get_signals(document_id: str, session: Session = Depends(get_session)) -> SignalListResponse:
    doc = session.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    signals = session.exec(select(Signal).where(Signal.document_id == doc.id)).all()
    return SignalListResponse(document_id=doc.id, signals=[_to_signal_read(s) for s in signals])
