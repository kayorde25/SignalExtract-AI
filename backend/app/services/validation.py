from __future__ import annotations

from .signal_extractor import ExtractedSignal


def validate_signal(signal: ExtractedSignal, source_chunk_text: str | None) -> ExtractedSignal:
    """Validation checks to reduce hallucination.

    Rule-based extractor is already grounded (signal text == evidence text), but we
    still enforce a couple of invariants so downstream systems can trust the schema.
    """

    confidence = max(0.0, min(1.0, float(signal.confidence)))
    needs_review = bool(signal.needs_review)
    validation_status = "ok"

    if not signal.evidence_text.strip():
        confidence = min(confidence, 0.2)
        needs_review = True
        validation_status = "evidence_missing"

    # If we cannot tie evidence back to a source chunk, it must be reviewed.
    if validation_status == "ok":
        if not source_chunk_text or not source_chunk_text.strip():
            confidence = min(confidence, 0.35)
            needs_review = True
            validation_status = "evidence_weak"
        elif signal.evidence_text.strip() not in source_chunk_text:
            confidence = min(confidence, 0.35)
            needs_review = True
            validation_status = "evidence_weak"

    if signal.signal_text.strip() not in signal.evidence_text:
        # If a future extractor normalizes/paraphrases, this catches unsupported signals.
        confidence = min(confidence, 0.4)
        needs_review = True
        validation_status = "evidence_mismatch" if validation_status == "ok" else validation_status

    return signal.__class__(
        **{
            **signal.__dict__,
            "confidence": confidence,
            "needs_review": needs_review,
            "validation_status": validation_status,
        }
    )
