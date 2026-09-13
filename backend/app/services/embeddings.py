from __future__ import annotations
from ..core.logging import get_logger

logger = get_logger(__name__)

_EMBEDDING_MODEL = "all-MiniLM-L6-v2"


def create_embeddings(texts: list[str]) -> list[list[float]] | None:
    """Return a list of float vectors, one per input text.

    Returns None when sentence_transformers is not installed — callers
    must fall back to keyword scoring.
    """
    if not texts:
        return []
    try:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer(_EMBEDDING_MODEL)
        return model.encode(texts, show_progress_bar=False).tolist()
    except ImportError:
        logger.debug("sentence_transformers not installed — embeddings disabled")
        return None
    except Exception as exc:
        logger.warning(f"Embedding generation failed: {exc}")
        return None


def embed_query(question: str) -> list[float] | None:
    """Embed a single query string. Returns None if embeddings unavailable."""
    result = create_embeddings([question])
    if result is None or len(result) == 0:
        return None
    return result[0]
