from datetime import datetime
from sqlmodel import Session, select

from ..models.collection import Collection
from ..models.collection_document import CollectionDocument
from ..models.document import Document
from ..models.document_entity import DocumentEntity
from ..schemas.collection import (
    CollectionCreate,
    CollectionUpdate,
    CollectionDocumentRef,
    CollectionDetailResponse,
)


def create_collection(body: CollectionCreate, session: Session) -> Collection:
    col = Collection(name=body.name, description=body.description)
    session.add(col)
    session.commit()
    session.refresh(col)
    return col


def update_collection(
    collection_id: str, body: CollectionUpdate, session: Session
) -> Collection:
    col = session.get(Collection, collection_id)
    if not col:
        raise ValueError("Collection not found")
    if body.name is not None:
        col.name = body.name
    if body.description is not None:
        col.description = body.description
    col.updated_at = datetime.utcnow()
    session.add(col)
    session.commit()
    session.refresh(col)
    return col


def delete_collection(collection_id: str, session: Session) -> None:
    col = session.get(Collection, collection_id)
    if not col:
        raise ValueError("Collection not found")
    rows = session.exec(
        select(CollectionDocument).where(CollectionDocument.collection_id == collection_id)
    ).all()
    for row in rows:
        session.delete(row)
    session.delete(col)
    session.commit()


def add_document(collection_id: str, document_id: str, session: Session) -> None:
    if not session.get(Collection, collection_id):
        raise ValueError("Collection not found")
    if not session.get(Document, document_id):
        raise ValueError("Document not found")
    existing = session.exec(
        select(CollectionDocument).where(
            CollectionDocument.collection_id == collection_id,
            CollectionDocument.document_id == document_id,
        )
    ).first()
    if not existing:
        session.add(CollectionDocument(
            collection_id=collection_id,
            document_id=document_id,
        ))
        col = session.get(Collection, collection_id)
        col.updated_at = datetime.utcnow()
        session.add(col)
        session.commit()


def remove_document(collection_id: str, document_id: str, session: Session) -> None:
    row = session.exec(
        select(CollectionDocument).where(
            CollectionDocument.collection_id == collection_id,
            CollectionDocument.document_id == document_id,
        )
    ).first()
    if not row:
        raise ValueError("Document not in collection")
    session.delete(row)
    col = session.get(Collection, collection_id)
    if col:
        col.updated_at = datetime.utcnow()
        session.add(col)
    session.commit()


def get_collection_detail(
    collection_id: str, session: Session
) -> CollectionDetailResponse:
    col = session.get(Collection, collection_id)
    if not col:
        raise ValueError("Collection not found")

    cd_rows = session.exec(
        select(CollectionDocument).where(CollectionDocument.collection_id == collection_id)
    ).all()
    doc_ids = [r.document_id for r in cd_rows]

    documents: list[CollectionDocumentRef] = []
    total_signals = 0

    for doc_id in doc_ids:
        doc = session.get(Document, doc_id)
        if doc:
            total_signals += doc.signal_count
            documents.append(CollectionDocumentRef(
                id=doc.id,
                filename=doc.original_filename,
                status=doc.status,
                signal_count=doc.signal_count,
            ))

    entity_count = 0
    if doc_ids:
        entity_ids = session.exec(
            select(DocumentEntity.entity_node_id)
            .where(DocumentEntity.document_id.in_(doc_ids))
            .distinct()
        ).all()
        entity_count = len(entity_ids)

    return CollectionDetailResponse(
        id=col.id,
        name=col.name,
        description=col.description,
        created_at=col.created_at,
        updated_at=col.updated_at,
        document_count=len(documents),
        signal_count=total_signals,
        entity_count=entity_count,
        documents=documents,
    )
