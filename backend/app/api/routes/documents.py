from __future__ import annotations

import logging
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlmodel import Session, select

from app.core.config import get_settings
from app.core.db import get_session
from app.models.document import Document
from app.schemas.document import DocumentRead, DocumentUploadResponse
from app.services.audit import audit_event
from app.services.storage import UploadTooLargeError, allowed_extension, persist_upload


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/documents")


def _to_document_read(doc: Document) -> DocumentRead:
    return DocumentRead(
        document_id=doc.id,
        filename=doc.filename,
        content_type=doc.content_type,
        file_ext=doc.file_ext,
        size_bytes=doc.size_bytes,
        sha256=doc.sha256,
        created_at=doc.created_at,
    )


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
) -> DocumentUploadResponse:
    """Upload a document and persist it.

    This endpoint stores the original file and records metadata in SQLite.
    """

    settings = get_settings()

    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing filename")

    if not allowed_extension(file.filename):
        raise HTTPException(status_code=415, detail="Unsupported file type")

    document_id = str(uuid4())

    try:
        storage_path, file_ext, size_bytes, sha256 = await persist_upload(
            file,
            document_id=document_id,
            max_bytes=settings.max_upload_mb * 1024 * 1024,
        )
    except UploadTooLargeError:
        raise HTTPException(status_code=413, detail="File too large")

    if size_bytes == 0:
        Path(storage_path).unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="Empty document")

    doc = Document(
        id=document_id,
        filename=file.filename,
        content_type=file.content_type,
        file_ext=file_ext,
        storage_path=storage_path,
        sha256=sha256,
        size_bytes=size_bytes,
    )

    session.add(doc)
    session.commit()
    session.refresh(doc)

    audit_event(
        session,
        event_type="document_uploaded",
        entity_type="document",
        entity_id=doc.id,
        document_id=doc.id,
        message=f"Document uploaded: {doc.filename}",
        actor=None,
        metadata={"content_type": doc.content_type, "size_bytes": doc.size_bytes, "sha256": doc.sha256},
    )
    session.commit()

    logger.info("Uploaded document %s (%s)", doc.id, doc.filename)

    return DocumentUploadResponse(document=_to_document_read(doc))


@router.get("/{document_id}", response_model=DocumentRead)
def get_document(document_id: str, session: Session = Depends(get_session)) -> DocumentRead:
    doc = session.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return _to_document_read(doc)
