from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from ...core.db import get_session
from ...core.security import verify_api_key
from ...models.document import Document
from ...schemas.document import DocumentRead
from ...services.pipeline import run_text_extraction, run_signal_extraction

router = APIRouter(prefix="/documents", tags=["extraction"])


@router.post("/{document_id}/extract-text", response_model=DocumentRead)
async def extract_text(
    document_id: str,
    session: Session = Depends(get_session),
    _: str | None = Depends(verify_api_key),
):
    if not session.get(Document, document_id):
        raise HTTPException(status_code=404, detail="Document not found")
    return await run_text_extraction(document_id, session)


@router.post("/{document_id}/extract-signals", response_model=DocumentRead)
async def extract_signals(
    document_id: str,
    session: Session = Depends(get_session),
    _: str | None = Depends(verify_api_key),
):
    doc = session.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not doc.text_content:
        raise HTTPException(status_code=400, detail="Run extract-text first")
    return await run_signal_extraction(document_id, session)
