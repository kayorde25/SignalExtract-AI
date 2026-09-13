from __future__ import annotations
import re
from ..schemas.retrieval import CitationResult

CANNOT_ANSWER = "I could not find enough information in the document to answer that."
WEAK_SOURCE_PREFIX = "I found potentially related sections, but they may not fully answer the question."
WEAK_SCORE_THRESHOLD = 0.05

_STOPWORDS = {
    "the", "a", "an", "is", "are", "was", "were", "in", "on", "at",
    "to", "of", "and", "or", "for", "with", "that", "this", "it",
    "be", "been", "have", "has", "had", "do", "does", "did", "what",
    "how", "when", "where", "who", "which", "i", "you", "we", "they",
    "me", "him", "her", "us", "them", "my", "your", "his", "its", "our",
    "s", "t", "can", "will", "would", "could", "should", "may", "might",
}


def generate_answer(question: str, citations: list[CitationResult]) -> str:
    """Produce a source-grounded extractive answer from retrieved citations.

    Guarantees: every word in the returned answer exists in the citation texts.
    No external API or LLM is used — works fully offline.
    """
    if not citations:
        return CANNOT_ANSWER

    max_score = max(c.score for c in citations)
    if max_score < WEAK_SCORE_THRESHOLD:
        return WEAK_SOURCE_PREFIX

    q_words = set(question.lower().split()) - _STOPWORDS
    sentences = _extract_sentences(citations[:3], q_words)

    if not sentences:
        # No keyword-matching sentences found — use the opening of the top chunk
        sentences = [_first_sentence(citations[0].text)]

    return " ".join(sentences[:3]).strip()


# ── helpers ───────────────────────────────────────────────────────────────────

def _extract_sentences(
    citations: list[CitationResult],
    q_words: set[str],
) -> list[str]:
    seen: set[str] = set()
    results: list[str] = []
    for citation in citations:
        for sent in _split_sentences(citation.text):
            sent_stripped = sent.strip()
            if not sent_stripped or sent_stripped in seen:
                continue
            if not q_words or any(w in sent_stripped.lower() for w in q_words):
                seen.add(sent_stripped)
                results.append(sent_stripped)
    return results


def _split_sentences(text: str) -> list[str]:
    return [s.strip() for s in re.split(r"(?<=[.?!])\s+", text) if s.strip()]


def _first_sentence(text: str) -> str:
    parts = _split_sentences(text)
    return parts[0] if parts else text[:200].strip()
