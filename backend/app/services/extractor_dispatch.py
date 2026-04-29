from __future__ import annotations

import logging
from dataclasses import asdict

from app.core.config import get_settings
from app.services.llm_extractor import extract_signals_llm
from app.services.signal_extractor import ExtractedSignal, extract_signals
from app.services.text_extractor import TextChunk


logger = logging.getLogger(__name__)


def extract_signals_by_mode(*, chunks: list[TextChunk], source_document: str) -> list[ExtractedSignal]:
    """Select extractor based on `EXTRACTION_MODE`.

    Modes:
    - rule_based: deterministic baseline
    - llm: LLM-only (falls back to rule_based if not configured)
    - hybrid: union(llm, rule_based) with dedupe
    """

    settings = get_settings()
    mode = (settings.extraction_mode or "rule_based").strip().lower()

    def _rule() -> list[ExtractedSignal]:
        return extract_signals(chunks, source_document=source_document)

    def _llm() -> list[ExtractedSignal]:
        # Convert chunks to simple dicts for prompt building.
        chunk_dicts = [asdict(c) for c in chunks]
        return extract_signals_llm(source_document=source_document, chunks=chunk_dicts)

    if mode == "rule_based":
        return _rule()

    if mode == "llm":
        try:
            return _llm()
        except Exception as e:
            logger.warning("LLM extraction unavailable; falling back to rule_based (%s)", e)
            return _rule()

    if mode == "hybrid":
        llm_signals: list[ExtractedSignal] = []
        try:
            llm_signals = _llm()
        except Exception as e:
            logger.warning("LLM extraction unavailable in hybrid; using rule_based only (%s)", e)

        rule_signals = _rule()

        # Deduplicate by (type, signal_text, location).
        unique: dict[tuple, ExtractedSignal] = {}
        for s in llm_signals + rule_signals:
            key = (s.signal_type, s.signal_text, s.source_page, s.source_section, s.paragraph_id)
            unique[key] = s
        return list(unique.values())

    logger.warning("Unknown EXTRACTION_MODE=%r; using rule_based", mode)
    return _rule()
