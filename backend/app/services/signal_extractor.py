from __future__ import annotations
import re
from dataclasses import dataclass

_W = 100  # evidence window (chars each side)


@dataclass
class RawSignal:
    signal_type: str
    value: str
    evidence: str
    confidence: float = 1.0
    char_offset_start: int | None = None
    char_offset_end: int | None = None


_PATTERNS: list[tuple[str, re.Pattern, float]] = [
    # ISO date
    ("date", re.compile(r"\b\d{4}[-/]\d{2}[-/]\d{2}\b"), 0.95),
    # US date
    ("date", re.compile(r"\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b"), 0.82),
    # Written date
    ("date", re.compile(
        r"\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?"
        r"|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)"
        r"\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}\b", re.IGNORECASE), 0.92),
    # Dollar amount
    ("amount", re.compile(r"\$\s*[\d,]+(?:\.\d{1,2})?(?:\s*(?:million|billion|thousand|M|B|K))?\b", re.IGNORECASE), 0.95),
    # Currency code
    ("amount", re.compile(r"\b[\d,]+(?:\.\d{1,2})?\s*(?:USD|EUR|GBP|CAD|AUD|CHF|JPY)\b"), 0.92),
    # Percentage
    ("percentage", re.compile(r"\b\d+(?:\.\d+)?\s*%"), 0.98),
    ("percentage", re.compile(r"\b\d+(?:\.\d+)?\s+percent\b", re.IGNORECASE), 0.88),
    # Email
    ("email", re.compile(r"\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b"), 0.99),
    # Phone (North American + international)
    ("phone", re.compile(r"\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b"), 0.88),
    ("phone", re.compile(r"\+\d{1,3}[-.\s]\d{1,4}[-.\s]\d{4,10}\b"), 0.90),
    # URL
    ("url", re.compile(r"https?://[^\s<>\"'{}|\\^`\[\]]+"), 0.99),
    # Structured identifier (REF-1234, INV-2024-001, etc.)
    ("identifier", re.compile(r"\b[A-Z]{2,6}-\d{3,}\b"), 0.85),
    # Labelled ID
    ("identifier", re.compile(
        r"\b(?:ID|Ref(?:erence)?|No\.?|Case|Ticket|Order|Invoice|Claim|Policy)\s*[:#]?\s*[A-Z0-9]{4,20}\b",
        re.IGNORECASE), 0.78),
    # Physical measurement
    ("measurement", re.compile(
        r"\b\d+(?:\.\d+)?\s*"
        r"(?:mg|g|kg|lb|lbs?|oz|ml|mL|L|cm|mm|m\b|km|ft|in|mph|kph|rpm|ppm|ppb|°[CF])\b"), 0.92),
]


def extract_signals(text: str) -> list[RawSignal]:
    signals: list[RawSignal] = []
    seen: set[tuple[str, str]] = set()

    for signal_type, pattern, confidence in _PATTERNS:
        for m in pattern.finditer(text):
            value = m.group().strip()
            key = (signal_type, value.lower())
            if key in seen:
                continue
            seen.add(key)

            start = max(0, m.start() - _W)
            end = min(len(text), m.end() + _W)
            evidence = text[start:end].strip()

            signals.append(RawSignal(
                signal_type=signal_type,
                value=value,
                evidence=evidence,
                confidence=confidence,
                char_offset_start=m.start(),
                char_offset_end=m.end(),
            ))

    return signals
