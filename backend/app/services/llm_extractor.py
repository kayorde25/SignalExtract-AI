from __future__ import annotations
import json
from ..core.config import settings
from ..core.logging import get_logger
from .signal_extractor import RawSignal

logger = get_logger(__name__)

_MAX_CHARS = 12_000

_SYSTEM = (
    "You are a precise signal extraction assistant analyzing real-world documents "
    "(clinical notes, operational reports, emails). Extract two kinds of signals.\n\n"
    "ENTITIES — verbatim data points:\n"
    "  date | amount | percentage | person_name | organization | location | email | phone "
    "| url | identifier | measurement | medical_code\n\n"
    "CLAIM-LEVEL — meaningful statements, INCLUDING indirect or implied ones:\n"
    "  finding        — an observation, result, or diagnosis stated in the text\n"
    "  recommendation — a suggested action or next step. INCLUDE implied recommendations "
    "(e.g. 'blood pressure remains elevated' implies considering a treatment change)\n"
    "  action         — something done, scheduled, or to be done\n"
    "  key_statement  — any other materially important statement\n"
    "  other          — notable, but fits none of the above\n\n"
    "For each signal return:\n"
    "  signal_type: exactly one type from the lists above\n"
    "  value: a clean value; for claim-level signals, a short paraphrase of the point\n"
    "  evidence: the VERBATIM source snippet it is based on (≤200 chars)\n"
    "  confidence: 0.0–1.0 (use lower confidence for indirect/implied signals)\n\n"
    "Prioritize recall: capture findings, recommendations, and actions even when phrased "
    "indirectly. Every signal MUST be grounded in real text via the evidence field.\n"
    'Return ONLY valid JSON: {"signals": [...]}'
)


async def extract_signals_llm(text: str) -> list[RawSignal]:
    truncated = text[:_MAX_CHARS]
    provider = settings.llm_provider.lower()

    if provider == "ollama":
        raw = await _call_ollama(truncated)
    else:
        raw = await _call_anthropic(truncated)

    if raw is None:
        return []

    return _parse_signals(raw)


async def _call_anthropic(text: str) -> str | None:
    if not settings.llm_api_key:
        logger.warning("LLM_API_KEY not set — skipping LLM extraction")
        return None

    try:
        import anthropic
    except ImportError:
        logger.error("anthropic package missing; install it to enable LLM extraction")
        return None

    client = anthropic.Anthropic(api_key=settings.llm_api_key)
    try:
        msg = client.messages.create(
            model=settings.llm_model,
            max_tokens=4096,
            system=_SYSTEM,
            messages=[{"role": "user", "content": f"Document:\n\n{text}"}],
        )
        return msg.content[0].text.strip()
    except Exception as exc:
        logger.error(f"LLM extraction error (anthropic): {exc}")
        return None


async def _call_ollama(text: str) -> str | None:
    import httpx

    payload = {
        "model": settings.llm_model,
        "messages": [
            {"role": "system", "content": _SYSTEM},
            {"role": "user", "content": f"Document:\n\n{text}"},
        ],
        "stream": False,
        "format": "json",
        "options": {"temperature": 0},
    }
    headers = (
        {"Authorization": f"Bearer {settings.llm_api_key}"}
        if settings.llm_api_key
        else {}
    )

    try:
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                f"{settings.llm_endpoint}/api/chat", json=payload, headers=headers
            )
            resp.raise_for_status()
            return resp.json()["message"]["content"].strip()
    except Exception as exc:
        logger.error(f"LLM extraction error (ollama): {exc}")
        return None


def _parse_signals(raw: str) -> list[RawSignal]:
    # Strip markdown fences if present
    if raw.startswith("```"):
        lines = raw.splitlines()
        raw = "\n".join(lines[1:] if lines[-1] != "```" else lines[1:-1])

    try:
        data = json.loads(raw)
    except (json.JSONDecodeError, ValueError) as exc:
        logger.error(f"LLM returned non-JSON output: {exc}")
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
