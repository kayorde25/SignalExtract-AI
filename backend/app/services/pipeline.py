from __future__ import annotations
from datetime import datetime
from sqlmodel import Session, select
from ..core.config import settings
from ..core.logging import get_logger
from ..models.document import Document
from ..models.extraction_run import ExtractionRun
from ..models.signal import Signal
from .storage import load_file
from .text_extractor import extract_text
from .extractor_dispatch import dispatch
from .audit import log_event

logger = get_logger(__name__)


def _now() -> datetime:
    return datetime.utcnow()


async def run_text_extraction(document_id: str, session: Session) -> Document:
    doc = session.get(Document, document_id)
    if not doc:
        raise ValueError(f"Document {document_id} not found")

    run = ExtractionRun(document_id=document_id, run_type="text", status="running")
    session.add(run)
    doc.status = "extracting_text"
    doc.updated_at = _now()
    session.add(doc)
    session.commit()

    t0 = _now()
    try:
        content = load_file(doc.filename)
        text, pages = extract_text(content, doc.original_filename)

        doc.text_content = text
        doc.page_count = pages
        doc.char_count = len(text)
        doc.status = "text_ready"
        doc.updated_at = _now()
        session.add(doc)

        run.status = "done"
        run.completed_at = _now()
        run.duration_ms = int((_now() - t0).total_seconds() * 1000)
        session.add(run)
        session.commit()
        session.refresh(doc)

        log_event(session, entity_type="document", entity_id=document_id,
                  action="text_extracted", details={"chars": len(text), "pages": pages})
        logger.info(f"Text extracted for {document_id}: {len(text)} chars, {pages} pages")
        return doc

    except Exception as exc:
        run.status = "error"
        run.error_message = str(exc)
        run.completed_at = _now()
        session.add(run)
        doc.status = "error"
        doc.error_message = str(exc)
        doc.updated_at = _now()
        session.add(doc)
        session.commit()
        logger.error(f"Text extraction failed for {document_id}: {exc}")
        raise


async def run_signal_extraction(document_id: str, session: Session) -> Document:
    doc = session.get(Document, document_id)
    if not doc:
        raise ValueError(f"Document {document_id} not found")
    if not doc.text_content:
        raise ValueError("Extract text before extracting signals")

    run = ExtractionRun(
        document_id=document_id,
        run_type="signals",
        mode=settings.extraction_mode,
        status="running",
    )
    session.add(run)
    doc.status = "extracting_signals"
    doc.extraction_mode = settings.extraction_mode
    doc.updated_at = _now()
    session.add(doc)
    session.commit()
    session.refresh(run)

    t0 = _now()
    try:
        raw_signals = await dispatch(doc.text_content)

        for raw in raw_signals:
            session.add(Signal(
                document_id=document_id,
                extraction_run_id=run.id,
                signal_type=raw.signal_type,
                value=raw.value,
                evidence=raw.evidence,
                confidence=raw.confidence,
                char_offset_start=raw.char_offset_start,
                char_offset_end=raw.char_offset_end,
            ))

        doc.signal_count = len(raw_signals)
        doc.approved_count = 0
        doc.status = "done"
        doc.updated_at = _now()
        session.add(doc)

        run.status = "done"
        run.signal_count = len(raw_signals)
        run.completed_at = _now()
        run.duration_ms = int((_now() - t0).total_seconds() * 1000)
        session.add(run)
        session.commit()
        session.refresh(doc)

        log_event(session, entity_type="document", entity_id=document_id,
                  action="signals_extracted",
                  details={"count": len(raw_signals), "mode": settings.extraction_mode})
        logger.info(f"Extracted {len(raw_signals)} signals for {document_id}")
        return doc

    except Exception as exc:
        run.status = "error"
        run.error_message = str(exc)
        run.completed_at = _now()
        session.add(run)
        doc.status = "error"
        doc.error_message = str(exc)
        doc.updated_at = _now()
        session.add(doc)
        session.commit()
        logger.error(f"Signal extraction failed for {document_id}: {exc}")
        raise
