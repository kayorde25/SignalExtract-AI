from __future__ import annotations

import json
import logging
from dataclasses import asdict
from datetime import datetime, timezone
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field, ValidationError

from app.core.config import get_settings
from app.services.signal_extractor import ExtractedSignal, SignalType


logger = logging.getLogger(__name__)


class LlmSignal(BaseModel):
    """Schema-constrained output contract for LLM extraction.

    Evidence-first rule: every signal MUST include verbatim evidence anchored to the
    source chunk location (page/section/paragraph).
    """

    signal_type: SignalType
    signal_text: str = Field(min_length=3)
    evidence_text: str = Field(min_length=3)

    source_page: int | None = None
    source_section: str | None = None
    paragraph_id: str | None = None

    subject: str | None = None
    action: str | None = None
    urgency: str | None = None
    certainty: str | None = None
    explicitness: Literal["explicit", "implied"] = "explicit"

    confidence: float = Field(ge=0.0, le=1.0)


class LlmExtractionResponse(BaseModel):
    signals: list[LlmSignal]


def build_prompt(*, source_document: str, chunks: list[dict[str, Any]]) -> str:
    """Prompt template for evidence-first extraction.

    This function does not call any external model. It exists so a future LLM
    backend can be plugged in behind the same contract.
    """

    # Keep the prompt compact; include only the chunk fields needed for evidence linking.
    chunk_lines: list[str] = []
    for c in chunks:
        chunk_lines.append(
            json.dumps(
                {
                    "paragraph_id": c.get("paragraph_id"),
                    "source_page": c.get("source_page"),
                    "source_section": c.get("source_section"),
                    "text": c.get("text"),
                },
                ensure_ascii=False,
            )
        )

    return "\n".join(
        [
            "You are an enterprise document intelligence extractor.",
            "Extract signals strictly grounded in the provided chunks.",
            "Return ONLY valid JSON with the following schema:",
            json.dumps(LlmExtractionResponse.model_json_schema(), ensure_ascii=False),
            "Rules:",
            "- evidence_text MUST be verbatim and MUST appear in the referenced chunk text.",
            "- signal_text may be normalized, but MUST be supported by evidence_text.",
            "- Provide confidence in [0,1]. If unsure, lower confidence and mark explicitness=implied.",
            f"Source document: {source_document}",
            "Chunks:",
            *chunk_lines,
        ]
    )


def parse_llm_json(payload: str) -> list[LlmSignal]:
    try:
        data = json.loads(payload)
        parsed = LlmExtractionResponse.model_validate(data)
        return parsed.signals
    except (json.JSONDecodeError, ValidationError) as e:
        raise ValueError(f"Invalid LLM JSON output: {e}")


def extract_signals_llm(*, source_document: str, chunks: list[dict[str, Any]]) -> list[ExtractedSignal]:
    """Optional LLM extraction.

    Behavior:
    - If `LLM_API_KEY` is not configured, raise to allow safe fallback.
    - If the OpenAI SDK is unavailable, raise (still safe fallback).

    NOTE: This repo intentionally does not ship a default LLM call in order to
    avoid surprising network behavior and secret handling pitfalls.
    """

    settings = get_settings()
    if not settings.llm_api_key or not settings.llm_api_key.get_secret_value().strip():
        raise RuntimeError("LLM extraction requested but LLM_API_KEY is not configured")

    try:
        import openai  # type: ignore
    except Exception as e:  # pragma: no cover
        raise RuntimeError("LLM extraction requested but the OpenAI SDK is not installed") from e

    # Intentionally not implemented: actual API call.
    # Implementors should:
    # - call a model with `build_prompt(...)`
    # - parse with `parse_llm_json(...)`
    # - convert to `ExtractedSignal` below
    raise RuntimeError("LLM extraction backend is not implemented in this repo")


def llm_signals_to_internal(signals: list[LlmSignal], *, source_document: str) -> list[ExtractedSignal]:
    now = datetime.now(timezone.utc)

    out: list[ExtractedSignal] = []
    for s in signals:
        # Default needs_review is conservative; validation will further adjust.
        needs_review = s.confidence < get_settings().review_threshold or s.explicitness == "implied"
        out.append(
            ExtractedSignal(
                signal_type=s.signal_type,
                signal_text=s.signal_text,
                evidence_text=s.evidence_text,
                source_document=source_document,
                source_page=s.source_page,
                source_section=s.source_section,
                paragraph_id=s.paragraph_id,
                subject=s.subject,
                action=s.action,
                urgency=s.urgency,
                certainty=s.certainty,
                explicitness=s.explicitness,
                confidence=float(s.confidence),
                needs_review=bool(needs_review),
                validation_status="ok",
                created_at=now,
            )
        )
    return out
