from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from ...core.db import get_session
from ...core.security import verify_api_key
from ...models.document import Document
from ...schemas.document import DocumentRead
from ...schemas.retrieval import QueryRequest, QueryResponse
from ...services.pipeline import run_chunking
from ...services.retrieval import search_document
from ...services.answering import generate_answer

router = APIRouter(prefix="/documents", tags=["retrieval"])


@router.post("/{document_id}/chunk", response_model=DocumentRead)
async def chunk_document(
    document_id: str,
    session: Session = Depends(get_session),
    _: str | None = Depends(verify_api_key),
):
    doc = session.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not doc.text_content:
        raise HTTPException(status_code=400, detail="Run extract-text first")
    return await run_chunking(document_id, session)


@router.post("/{document_id}/query", response_model=QueryResponse)
async def query_document(
    document_id: str,
    req: QueryRequest,
    session: Session = Depends(get_session),
    _: str | None = Depends(verify_api_key),
):
    doc = session.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    citations = search_document(document_id, req.question, session, top_k=5)
    answer = generate_answer(req.question, citations)
    return QueryResponse(answer=answer, citations=citations)
