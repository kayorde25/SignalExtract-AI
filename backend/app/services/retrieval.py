from __future__ import annotations
import json
from sqlmodel import Session, select
from ..core.logging import get_logger
from ..models.chunk import DocumentChunk
from ..schemas.retrieval import CitationResult
from .embeddings import create_embeddings, embed_query

logger = get_logger(__name__)


def retrieve_chunks(document_id: str, session: Session) -> list[DocumentChunk]:
    """Return all chunks for a document ordered by chunk_index."""
    return list(session.exec(
        select(DocumentChunk)
        .where(DocumentChunk.document_id == document_id)
        .order_by(DocumentChunk.chunk_index)
    ).all())


def search_document(
    document_id: str,
    question: str,
    session: Session,
    top_k: int = 5,
) -> list[CitationResult]:
    """Return the top-k most relevant chunks for the given question.

    Uses cosine similarity when embeddings are stored; falls back to
    keyword overlap scoring when they are not.
    """
    chunks = retrieve_chunks(document_id, session)
    if not chunks:
        return []

    # Determine whether any chunk has an embedding stored
    has_embeddings = any(c.embedding_json is not None for c in chunks)

    if has_embeddings:
        q_vec = embed_query(question)
        if q_vec is not None:
            scored = _score_vector(chunks, q_vec)
        else:
            scored = _score_keyword(chunks, question)
    else:
        scored = _score_keyword(chunks, question)

    scored.sort(key=lambda x: x[1], reverse=True)
    top = scored[:top_k]

    return [
        CitationResult(
            chunk_id=chunk.id,
            chunk_index=chunk.chunk_index,
            page_number=chunk.page_number,
            text=chunk.text,
            score=round(score, 4),
        )
        for chunk, score in top
    ]


# ── scoring helpers ────────────────────────────────────────────────────────────

def _score_vector(
    chunks: list[DocumentChunk],
    q_vec: list[float],
) -> list[tuple[DocumentChunk, float]]:
    try:
        import numpy as np
        q = np.array(q_vec, dtype=float)
        q_norm = np.linalg.norm(q)
        results: list[tuple[DocumentChunk, float]] = []
        for chunk in chunks:
            if chunk.embedding_json is None:
                results.append((chunk, 0.0))
                continue
            c_vec = json.loads(chunk.embedding_json)
            c = np.array(c_vec, dtype=float)
            denom = q_norm * np.linalg.norm(c)
            score = float(np.dot(q, c) / (denom + 1e-8))
            results.append((chunk, score))
        return results
    except Exception as exc:
        logger.warning(f"Vector scoring failed, falling back to keyword: {exc}")
        return _score_keyword(chunks, "")


def _score_keyword(
    chunks: list[DocumentChunk],
    query: str,
) -> list[tuple[DocumentChunk, float]]:
    q_words = set(query.lower().split()) if query.strip() else set()
    results: list[tuple[DocumentChunk, float]] = []
    for chunk in chunks:
        words = chunk.text.lower().split()
        if not words or not q_words:
            results.append((chunk, 0.0))
            continue
        score = sum(1 for w in words if w in q_words) / len(words)
        results.append((chunk, score))
    return results
