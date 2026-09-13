"""Tests for chunking, retrieval, and answer generation (Phase 3B)."""
import io

from app.models.document import Document
from app.models.chunk import DocumentChunk
from app.services.retrieval import search_document
from app.services.answering import (
    generate_answer,
    CANNOT_ANSWER,
    WEAK_SOURCE_PREFIX,
    WEAK_SCORE_THRESHOLD,
)
from app.schemas.retrieval import CitationResult


# ── helpers ───────────────────────────────────────────────────────────────────

def _upload(client, content: bytes = b"The payment is due within 30 days of invoice receipt.\n\nInterest accrues at 1.5 percent per month on overdue balances."):
    r = client.post(
        "/api/v1/documents/upload",
        files={"file": ("contract.txt", io.BytesIO(content), "text/plain")},
    )
    assert r.status_code == 201
    return r.json()


def _extract_text(client, doc_id: str):
    r = client.post(f"/api/v1/documents/{doc_id}/extract-text")
    assert r.status_code == 200
    return r.json()


def _make_chunk(session, document_id: str, text: str, index: int = 0) -> DocumentChunk:
    chunk = DocumentChunk(
        document_id=document_id,
        chunk_index=index,
        text=text,
        char_offset_start=0,
        char_offset_end=len(text),
    )
    session.add(chunk)
    session.commit()
    session.refresh(chunk)
    return chunk


def _make_doc(session, text: str = "sample text") -> Document:
    doc = Document(
        filename="test.txt",
        original_filename="test.txt",
        content_type="text/plain",
        file_size=len(text),
        text_content=text,
        status="text_ready",
    )
    session.add(doc)
    session.commit()
    session.refresh(doc)
    return doc


# ── test: query with no chunks ─────────────────────────────────────────────────

def test_query_no_chunks(client):
    """Querying a doc with no chunks returns CANNOT_ANSWER."""
    doc = _upload(client)
    # Do NOT extract text — no chunks will exist
    r = client.post(
        f"/api/v1/documents/{doc['id']}/query",
        json={"question": "what is the payment term?"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["answer"] == CANNOT_ANSWER
    assert data["citations"] == []


# ── test: query with keyword-matching chunks ────────────────────────────────────

def test_query_keyword_matching(session):
    """search_document returns scored results when keywords match."""
    doc = _make_doc(session)
    _make_chunk(session, doc.id, "Payment is due within 30 days of invoice receipt.", index=0)
    _make_chunk(session, doc.id, "Interest accrues on overdue balances at 1.5% monthly.", index=1)

    results = search_document(doc.id, "payment due days", session, top_k=5)

    assert len(results) > 0
    assert results[0].score > 0
    # Top result should be about payment
    assert "payment" in results[0].text.lower() or "due" in results[0].text.lower()


# ── test: query with no keyword match (weak) ───────────────────────────────────

def test_query_no_keyword_match(session):
    """When no keywords match, scores are at or near zero."""
    doc = _make_doc(session)
    _make_chunk(session, doc.id, "The quick brown fox jumps over the lazy dog.", index=0)

    results = search_document(doc.id, "payment invoice overdue", session, top_k=5)

    # Keyword overlap should be near zero for unrelated text
    assert all(r.score < WEAK_SCORE_THRESHOLD or r.score == 0.0 for r in results)


# ── test: answer uses citation text only ───────────────────────────────────────

def test_answer_uses_citation_text_only():
    """Every word in the generated answer must exist in the citation texts."""
    citations = [
        CitationResult(
            chunk_id="c1",
            chunk_index=0,
            page_number=1,
            text="Payment is due within 30 days of invoice receipt.",
            score=0.8,
        ),
        CitationResult(
            chunk_id="c2",
            chunk_index=1,
            page_number=2,
            text="Interest accrues at 1.5 percent per month on overdue balances.",
            score=0.6,
        ),
    ]

    answer = generate_answer("when is payment due?", citations)

    # Answer must not be the fallback messages (we have good citations)
    assert answer not in (CANNOT_ANSWER, WEAK_SOURCE_PREFIX)
    assert len(answer) > 0

    # Every word in the answer must appear in the combined source texts
    all_source_words = set()
    for c in citations:
        all_source_words.update(c.text.lower().split())

    answer_words = set(answer.lower().split())
    invented = answer_words - all_source_words
    assert not invented, f"Answer contains invented words: {invented}"


# ── test: chunking is idempotent ───────────────────────────────────────────────

def test_chunking_idempotent(client):
    """Running /chunk twice produces the same number of chunks, no duplicates."""
    doc = _upload(client)
    _extract_text(client, doc["id"])  # auto-chunks once

    # Get chunk count after auto-chunk
    r1 = client.post(f"/api/v1/documents/{doc['id']}/query",
                     json={"question": "payment"})
    count1 = len(r1.json()["citations"])

    # Manually re-chunk
    r = client.post(f"/api/v1/documents/{doc['id']}/chunk")
    assert r.status_code == 200

    # Chunk count should be the same (idempotent)
    r2 = client.post(f"/api/v1/documents/{doc['id']}/query",
                     json={"question": "payment"})
    count2 = len(r2.json()["citations"])

    assert count1 == count2


# ── test: auto-chunk after extract-text ────────────────────────────────────────

def test_auto_chunk_after_extract_text(client):
    """Calling /extract-text auto-triggers chunking without manual /chunk call."""
    doc = _upload(client)
    _extract_text(client, doc["id"])

    # Query should return results without ever calling /chunk
    r = client.post(
        f"/api/v1/documents/{doc['id']}/query",
        json={"question": "payment due invoice"},
    )
    assert r.status_code == 200
    data = r.json()
    # Should have chunks (auto-created) and a real answer
    assert data["answer"] != ""
    # Citations should be present since content matches the query
    assert len(data["citations"]) > 0
