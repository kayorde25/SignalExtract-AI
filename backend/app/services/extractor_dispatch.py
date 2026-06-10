from __future__ import annotations
import asyncio
from ..core.config import settings
from ..core.logging import get_logger
from .signal_extractor import extract_signals as _rule_based, RawSignal
from .llm_extractor import extract_signals_llm

logger = get_logger(__name__)


async def dispatch(text: str, mode: str | None = None) -> list[RawSignal]:
    effective = mode or settings.extraction_mode

    if effective == "rule_based":
        return await asyncio.to_thread(_rule_based, text)

    if effective == "llm":
        result = await extract_signals_llm(text)
        if not result:
            logger.info("LLM returned nothing — falling back to rule-based")
            return await asyncio.to_thread(_rule_based, text)
        return result

    if effective == "hybrid":
        rule, llm = await asyncio.gather(
            asyncio.to_thread(_rule_based, text),
            extract_signals_llm(text),
        )
        return _merge(rule, llm)

    logger.warning(f"Unknown extraction mode '{effective}' — defaulting to rule_based")
    return await asyncio.to_thread(_rule_based, text)


def _merge(a: list[RawSignal], b: list[RawSignal]) -> list[RawSignal]:
    seen: set[tuple[str, str]] = set()
    out: list[RawSignal] = []
    for sig in a + b:
        key = (sig.signal_type, sig.value.lower().strip())
        if key not in seen:
            seen.add(key)
            out.append(sig)
    return out
