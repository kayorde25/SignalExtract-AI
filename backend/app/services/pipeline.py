from __future__ import annotations

from dataclasses import asdict

from .text_extractor import extract_text
from .signal_extractor import ExtractedSignal
from .extractor_dispatch import extract_signals_by_mode
from .validation import validate_signal


def run_pipeline(file_path: str, source_document: str) -> tuple[str, list[dict], list[dict]]:
    """Run the end-to-end pipeline for a persisted file.

    Returns:
    - full_text
    - chunks (as dicts)
    - signals (as dicts)

    Important: This pipeline is deterministic and evidence-grounded.
    """

    extracted_text = extract_text(file_path)

    # Empty/scan-only PDFs or documents with no extractable text should be handled explicitly.
    if not extracted_text.text.strip():
        raise ValueError("No extractable text found in document")

    signals: list[ExtractedSignal] = extract_signals_by_mode(chunks=extracted_text.chunks, source_document=source_document)

    # Evidence validation requires access to the exact source chunk.
    chunk_by_paragraph_id = {c.paragraph_id: c.text for c in extracted_text.chunks if c.paragraph_id}
    validated = [validate_signal(s, chunk_by_paragraph_id.get(s.paragraph_id)) for s in signals]

    chunks_dict = [asdict(c) for c in extracted_text.chunks]
    signals_dict = [asdict(s) for s in validated]

    return extracted_text.text, chunks_dict, signals_dict
