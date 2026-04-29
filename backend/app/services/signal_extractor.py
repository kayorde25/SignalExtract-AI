from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Iterable, Literal

from app.core.config import get_settings
from .text_extractor import TextChunk


SignalType = Literal[
    "finding",
    "recommendation",
    "action",
    "risk",
    "clinical_statement",
    "operational_statement",
]


@dataclass(frozen=True)
class ExtractedSignal:
    """Internal representation of a signal before persistence."""

    signal_type: SignalType
    signal_text: str
    evidence_text: str

    source_document: str
    source_page: int | None
    source_section: str | None
    paragraph_id: str | None

    subject: str | None
    action: str | None
    urgency: str | None
    certainty: str | None
    explicitness: Literal["explicit", "implied"]

    confidence: float
    needs_review: bool

    created_at: datetime

    # Evidence validation status (populated by validation step)
    validation_status: str = "ok"


_SENT_SPLIT = re.compile(r"(?<=[.!?])\s+")


def _sentences(text: str) -> list[str]:
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return []
    return [s.strip() for s in _SENT_SPLIT.split(text) if s.strip()]


def _urgency(sentence: str) -> str | None:
    s = sentence.lower()
    if any(k in s for k in ["urgent", "immediately", "asap", "stat", "within 24"]):
        return "high"
    if any(k in s for k in ["soon", "within 48", "within 72", "within a week"]):
        return "medium"
    return None


def _certainty(sentence: str) -> str | None:
    s = sentence.lower()
    if any(k in s for k in ["confirmed", "definitely", "diagnosed", "clear evidence"]):
        return "high"
    if any(k in s for k in ["suggests", "likely", "probable"]):
        return "medium"
    if any(k in s for k in ["possible", "may", "might", "could"]):
        return "low"
    return None


def _explicitness(sentence: str) -> Literal["explicit", "implied"]:
    s = sentence.lower()
    return "implied" if any(k in s for k in ["may", "might", "could", "possible", "suggests", "likely"]) else "explicit"


def _extract_action(sentence: str) -> str | None:
    # Heuristic verb phrase extraction.
    s = sentence.strip()
    m = re.search(r"\b(should|must|recommend|recommended|consider)\b\s+(.*)$", s, flags=re.IGNORECASE)
    if not m:
        return None
    action_text = m.group(2).strip()
    return action_text[:200] if action_text else None


def _extract_subject(sentence: str) -> str | None:
    # Minimal heuristic: look for common subjects.
    s = sentence.lower()
    for candidate in ["patient", "the patient", "system", "service", "database", "team", "site", "device", "workflow"]:
        if candidate in s:
            return candidate.replace("the ", "")
    return None


def _is_clinical(sentence: str) -> bool:
    s = sentence.lower()
    return any(k in s for k in ["patient", "diagnosis", "symptom", "bp", "hr", "mg", "ct", "mri", "labs", "wbc", "fever", "pain", "medication"])


def _is_operational(sentence: str) -> bool:
    s = sentence.lower()
    return any(k in s for k in ["incident", "outage", "latency", "throughput", "deployment", "rollback", "sla", "ticket", "on-call", "database", "server", "cpu", "memory"])


def _confidence_base(signal_type: str, sentence: str) -> float:
    s = sentence.lower()
    base = 0.55

    strong = {
        "finding": ["evidence of", "was found", "we observed", "shows", "indicates"],
        "recommendation": ["recommend", "it is recommended", "we advise"],
        "action": ["must", "should", "needs to", "action:"],
        "risk": ["risk", "concern", "may lead", "at risk"],
    }

    if signal_type in strong and any(k in s for k in strong[signal_type]):
        base += 0.15

    if any(ch.isdigit() for ch in sentence):
        base += 0.05

    if len(sentence) < 40:
        base -= 0.05

    return max(0.05, min(0.95, base))


def extract_signals(chunks: Iterable[TextChunk], source_document: str) -> list[ExtractedSignal]:
    """High-recall rule-based extraction.

    This is a baseline extractor intended to be auditable and deterministic.
    A future LLM-based extractor can be plugged in behind the same interface.
    """

    settings = get_settings()

    patterns: dict[SignalType, list[str]] = {
        "finding": ["evidence of", "shows", "indicates", "suggests", "was found", "revealed", "we observed"],
        "recommendation": ["recommend", "recommended", "consider", "it is recommended", "we advise"],
        "action": ["must", "should", "needs to", "follow up", "schedule", "review"],
        "risk": ["risk", "concern", "hazard", "deterioration", "potential"],
        "clinical_statement": [],
        "operational_statement": [],
    }

    extracted: list[ExtractedSignal] = []

    for chunk in chunks:
        for sentence in _sentences(chunk.text):
            s_lower = sentence.lower()

            matched_types: set[SignalType] = set()
            for stype, keys in patterns.items():
                if keys and any(k in s_lower for k in keys):
                    matched_types.add(stype)

            # Capture key domain statements even if they don't match action/finding patterns.
            if _is_clinical(sentence):
                matched_types.add("clinical_statement")
            if _is_operational(sentence):
                matched_types.add("operational_statement")

            for stype in matched_types:
                confidence = _confidence_base(stype, sentence)
                explicitness = _explicitness(sentence)
                needs_review = confidence < settings.review_threshold or explicitness == "implied"

                extracted.append(
                    ExtractedSignal(
                        signal_type=stype,
                        signal_text=sentence,
                        evidence_text=sentence,
                        source_document=source_document,
                        source_page=chunk.source_page,
                        source_section=chunk.source_section,
                        paragraph_id=chunk.paragraph_id,
                        subject=_extract_subject(sentence),
                        action=_extract_action(sentence) if stype in {"action", "recommendation"} else None,
                        urgency=_urgency(sentence),
                        certainty=_certainty(sentence),
                        explicitness=explicitness,
                        confidence=confidence,
                        needs_review=needs_review,
                        created_at=datetime.now(timezone.utc),
                    )
                )

    # Deduplicate obvious repeats (same text + type + location).
    unique: dict[tuple, ExtractedSignal] = {}
    for s in extracted:
        key = (s.signal_type, s.signal_text, s.source_page, s.source_section, s.paragraph_id)
        unique[key] = s

    return list(unique.values())
