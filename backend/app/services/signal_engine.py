from __future__ import annotations
import re
from sqlmodel import Session, select
from ..models.document import Document
from ..models.signal import Signal
from ..models.extraction_run import ExtractionRun
from ..models.chunk import DocumentChunk
from ..core.logging import get_logger

logger = get_logger(__name__)

_TITLE_CASE = re.compile(r'\b([A-Z][a-z]{1,}(?:\s+[A-Z][a-z]{1,})+)\b')

_SKIP_FIRST = {
    "The", "A", "An", "This", "That", "These", "Those", "It", "He", "She",
    "They", "We", "You", "In", "On", "At", "To", "Of", "And", "Or", "For",
    "With", "But", "So", "Also", "Such", "Some", "Any", "All", "Both",
    "Each", "Either", "Neither", "More", "Most", "Much", "Many", "Other",
    "Same", "Very", "Just", "Even", "Still", "Only", "First", "Last",
    "New", "Old", "High", "Low", "Long", "Short", "Large", "Small", "Good",
    "Next", "Several", "Another", "However", "Therefore", "Furthermore",
    "Moreover", "Although", "Because", "Since", "While", "When", "Where",
    "Which", "Who", "Whereas", "Thus", "Hence", "Accordingly", "Subsequently",
}


def _extract_entities(text: str) -> list[dict]:
    try:
        import spacy
        nlp = spacy.load("en_core_web_sm")
        doc = nlp(text)
        results = []
        for ent in doc.ents:
            if ent.label_ == "PERSON":
                signal_type = "person_name"
            elif ent.label_ == "ORG":
                signal_type = "organization"
            elif ent.label_ in ("GPE", "LOC", "FAC"):
                signal_type = "location"
            else:
                continue
            sentence = ent.sent.text.strip()[:500] if ent.sent else text[:300]
            results.append({
                "signal_type": signal_type,
                "value": ent.text.strip(),
                "evidence": sentence,
                "confidence": 0.82,
                "char_offset_start": ent.start_char,
                "char_offset_end": ent.end_char,
            })
        return results
    except (ImportError, OSError):
        return _extract_entities_heuristic(text)


def _extract_entities_heuristic(text: str) -> list[dict]:
    results = []
    seen: set[str] = set()
    for m in _TITLE_CASE.finditer(text):
        entity = m.group(0)
        words = entity.split()
        if words[0] in _SKIP_FIRST:
            continue
        if entity in seen:
            continue
        seen.add(entity)
        signal_type = "person_name" if len(words) == 2 else "organization"
        start = max(0, m.start() - 60)
        end = min(len(text), m.end() + 60)
        evidence = text[start:end].strip()
        results.append({
            "signal_type": signal_type,
            "value": entity,
            "evidence": evidence,
            "confidence": 0.30,
            "char_offset_start": m.start(),
            "char_offset_end": m.end(),
        })
    return results


async def run_entity_extraction(document_id: str, session: Session) -> Document:
    """Extract named entities from document chunks, writing to the Signal table.

    Idempotent: removes any prior entity_extraction run signals before re-running.
    Skips silently when no chunks exist (chunking not yet done).
    """
    doc = session.get(Document, document_id)
    if not doc:
        raise ValueError(f"Document {document_id} not found")

    chunks = session.exec(
        select(DocumentChunk)
        .where(DocumentChunk.document_id == document_id)
        .order_by(DocumentChunk.chunk_index)
    ).all()

    if not chunks:
        logger.debug(f"No chunks for {document_id} — skipping entity extraction")
        return doc

    # Idempotency: remove previous entity extraction runs + their signals
    prev_runs = session.exec(
        select(ExtractionRun).where(
            ExtractionRun.document_id == document_id,
            ExtractionRun.run_type == "entity_extraction",
        )
    ).all()
    for prev_run in prev_runs:
        old_sigs = session.exec(
            select(Signal).where(Signal.extraction_run_id == prev_run.id)
        ).all()
        for sig in old_sigs:
            session.delete(sig)
        session.delete(prev_run)
    if prev_runs:
        session.commit()

    run = ExtractionRun(document_id=document_id, run_type="entity_extraction", status="running")
    session.add(run)
    session.commit()
    session.refresh(run)

    total = 0
    seen_values: set[str] = set()
    for chunk in chunks:
        for ent in _extract_entities(chunk.text):
            key = f"{ent['signal_type']}:{ent['value'].lower()}"
            if key in seen_values:
                continue
            seen_values.add(key)
            session.add(Signal(
                document_id=document_id,
                extraction_run_id=run.id,
                signal_type=ent["signal_type"],
                value=ent["value"],
                evidence=ent["evidence"],
                confidence=ent["confidence"],
                char_offset_start=ent.get("char_offset_start"),
                char_offset_end=ent.get("char_offset_end"),
            ))
            total += 1

    run.status = "done"
    run.signal_count = total
    session.add(run)
    session.commit()  # persist entity signals + run record

    # Update doc.signal_count to reflect all signals (entity + any prior extractions)
    all_count = len(session.exec(
        select(Signal).where(Signal.document_id == document_id)
    ).all())
    doc.signal_count = all_count
    session.add(doc)
    session.commit()
    session.refresh(doc)

    logger.info(f"Entity extraction for {document_id}: {total} entities inserted")
    return doc
