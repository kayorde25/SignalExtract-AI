from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlmodel import Session, select, func
from ...core.db import get_session
from ...core.security import verify_api_key
from ...models.document import Document
from ...schemas.document import DocumentRead, DocumentList
from ...services.storage import save_file, delete_file
from ...services.validation import validate_upload
from ...services.audit import log_event

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    _: str | None = Depends(verify_api_key),
):
    content = await file.read()
    fname = file.filename or "upload"
    validate_upload(fname, len(content))
    stored_path, file_size = save_file(fname, content)

    doc = Document(
        filename=stored_path,
        original_filename=fname,
        content_type=file.content_type or "application/octet-stream",
        file_size=file_size,
    )
    session.add(doc)
    session.commit()
    session.refresh(doc)
    log_event(session, entity_type="document", entity_id=doc.id, action="uploaded",
              details={"filename": fname, "size": file_size})
    return doc


@router.get("/", response_model=DocumentList)
async def list_documents(
    skip: int = 0,
    limit: int = 50,
    session: Session = Depends(get_session),
    _: str | None = Depends(verify_api_key),
):
    total = session.exec(select(func.count()).select_from(Document)).one()
    docs = session.exec(
        select(Document).order_by(Document.uploaded_at.desc()).offset(skip).limit(limit)
    ).all()
    return DocumentList(items=list(docs), total=total)


@router.get("/{document_id}", response_model=DocumentRead)
async def get_document(
    document_id: str,
    session: Session = Depends(get_session),
    _: str | None = Depends(verify_api_key),
):
    doc = session.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.get("/{document_id}/text")
async def get_document_text(
    document_id: str,
    session: Session = Depends(get_session),
    _: str | None = Depends(verify_api_key),
):
    doc = session.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"id": doc.id, "text": doc.text_content or "", "char_count": doc.char_count}


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: str,
    session: Session = Depends(get_session),
    _: str | None = Depends(verify_api_key),
):
    doc = session.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    delete_file(doc.filename)
    log_event(session, entity_type="document", entity_id=document_id, action="deleted")
    session.delete(doc)
    session.commit()
