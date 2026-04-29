from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.core.db import get_session
from app.models.document import Document
from app.models.extraction_run import ExtractionRun
from app.schemas.document import DocumentRead
from app.schemas.extraction import ExtractionRunRead
from app.schemas.history import HistoryResponse


router = APIRouter()


@router.get("/history", response_model=HistoryResponse)
def history(session: Session = Depends(get_session)) -> HistoryResponse:
    docs = session.exec(select(Document).order_by(Document.created_at.desc()).limit(50)).all()
    runs = session.exec(select(ExtractionRun).order_by(ExtractionRun.created_at.desc()).limit(100)).all()

    documents = [
        DocumentRead(
            document_id=d.id,
            filename=d.filename,
            content_type=d.content_type,
            file_ext=d.file_ext,
            size_bytes=d.size_bytes,
            sha256=d.sha256,
            created_at=d.created_at,
        )
        for d in docs
    ]

    extraction_runs = [
        ExtractionRunRead(
            extraction_run_id=r.id,
            document_id=r.document_id,
            status=r.status,
            pipeline_version=r.pipeline_version,
            error_message=r.error_message,
            created_at=r.created_at,
        )
        for r in runs
    ]

    return HistoryResponse(documents=documents, extraction_runs=extraction_runs)
