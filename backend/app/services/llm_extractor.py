from __future__ import annotations
import json
from ..core.config import settings
from ..core.logging import get_logger
from .signal_extractor import RawSignal

logger = get_logger(__name__)

_MAX_CHARS = 12_000

_SYSTEM = (
    "You are a precise signal extraction assistant. "
    "Extract every structured data point from the document text provided.\n\n"
    "For each signal return:\n"
    "  signal_type: date | amount | percentage | person_name | organization | location "
    "| email | phone | url | identifier | measurement | medical_code | other\n"
    "  value: clean extracted string\n"
    "  evidence: verbatim source snippet ≤150 chars\n"
    "  confidence: 0.0–1.0\n\n"
    'Return ONLY valid JSON: {"signals": [...]}'
)


async def extract_signals_llm(text: str) -> list[RawSignal]:
    if not settings.llm_api_key:
        logger.warning("LLM_API_KEY not set — skipping LLM extraction")
        return []

    try:
        import anthropic
    except ImportError:
        logger.error("anthropic package missing; install it to enable LLM extraction")
        return []

    truncated = text[:_MAX_CHARS]
    client = anthropic.Anthropic(api_key=settings.llm_api_key)

    try:
        msg = client.messages.create(
            model=settings.llm_model,
            max_tokens=4096,
            system=_SYSTEM,
            messages=[{"role": "user", "content": f"Document:\n\n{truncated}"}],
        )
        raw = msg.content[0].text.strip()
        # Strip markdown fences if present
        if raw.startswith("```"):
            lines = raw.splitlines()
            raw = "\n".join(lines[1:] if lines[-1] != "```" else lines[1:-1])
        data = json.loads(raw)
    except Exception as exc:
        logger.error(f"LLM extraction error: {exc}")
        return []

    results: list[RawSignal] = []
    for item in data.get("signals", []):
        try:
            results.append(RawSignal(
                signal_type=str(item.get("signal_type", "other")).lower(),
                value=str(item.get("value", "")).strip(),
                evidence=str(item.get("evidence", "")).strip()[:200],
                confidence=min(1.0, max(0.0, float(item.get("confidence", 0.8)))),
            ))
        except (TypeError, ValueError):
            continue

    logger.info(f"LLM returned {len(results)} signals")
    return results
