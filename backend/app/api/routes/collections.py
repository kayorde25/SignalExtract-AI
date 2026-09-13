from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ...core.db import get_session
from ...core.security import verify_api_key
from ...models.collection import Collection
from ...models.collection_document import CollectionDocument
from ...models.document_entity import DocumentEntity
from ...models.entity_node import EntityNode
from ...models.entity_edge import EntityEdge
from ...schemas.collection import (
    CollectionCreate,
    CollectionUpdate,
    CollectionResponse,
    CollectionDetailResponse,
    CollectionList,
    AddDocumentRequest,
)
from ...schemas.graph import GraphResponse, GraphNodeResponse, GraphEdgeResponse
from ...services.collections import (
    create_collection,
    update_collection,
    delete_collection,
    add_document,
    remove_document,
    get_collection_detail,
)
from ...services.knowledge_graph import build_document_graph

router = APIRouter(prefix="/collections", tags=["collections"])


@router.get("/", response_model=CollectionList)
async def list_collections(
    session: Session = Depends(get_session),
    _: None = Depends(verify_api_key),
):
    items = session.exec(
        select(Collection).order_by(Collection.updated_at.desc())
    ).all()
    return CollectionList(items=list(items), total=len(items))


@router.post("/", response_model=CollectionResponse, status_code=status.HTTP_201_CREATED)
async def create_collection_endpoint(
    body: CollectionCreate,
    session: Session = Depends(get_session),
    _: None = Depends(verify_api_key),
):
    return create_collection(body, session)


@router.get("/{collection_id}", response_model=CollectionDetailResponse)
async def get_collection(
    collection_id: str,
    session: Session = Depends(get_session),
    _: None = Depends(verify_api_key),
):
    try:
        return get_collection_detail(collection_id, session)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.patch("/{collection_id}", response_model=CollectionResponse)
async def update_collection_endpoint(
    collection_id: str,
    body: CollectionUpdate,
    session: Session = Depends(get_session),
    _: None = Depends(verify_api_key),
):
    try:
        return update_collection(collection_id, body, session)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{collection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_collection_endpoint(
    collection_id: str,
    session: Session = Depends(get_session),
    _: None = Depends(verify_api_key),
):
    try:
        delete_collection(collection_id, session)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post(
    "/{collection_id}/documents",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def add_document_endpoint(
    collection_id: str,
    body: AddDocumentRequest,
    session: Session = Depends(get_session),
    _: None = Depends(verify_api_key),
):
    try:
        add_document(collection_id, body.document_id, session)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete(
    "/{collection_id}/documents/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_document_endpoint(
    collection_id: str,
    document_id: str,
    session: Session = Depends(get_session),
    _: None = Depends(verify_api_key),
):
    try:
        remove_document(collection_id, document_id, session)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{collection_id}/graph", response_model=GraphResponse)
async def get_collection_graph(
    collection_id: str,
    session: Session = Depends(get_session),
    _: None = Depends(verify_api_key),
):
    col = session.get(Collection, collection_id)
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found")

    cd_rows = session.exec(
        select(CollectionDocument).where(CollectionDocument.collection_id == collection_id)
    ).all()
    doc_ids = [r.document_id for r in cd_rows]

    if not doc_ids:
        return GraphResponse(nodes=[], edges=[])

    for doc_id in doc_ids:
        build_document_graph(doc_id, session)

    de_rows = session.exec(
        select(DocumentEntity).where(DocumentEntity.document_id.in_(doc_ids))
    ).all()
    entity_ids = {r.entity_node_id for r in de_rows}

    if not entity_ids:
        return GraphResponse(nodes=[], edges=[])

    nodes = session.exec(
        select(EntityNode).where(EntityNode.id.in_(list(entity_ids)))
    ).all()

    candidate_edges = session.exec(
        select(EntityEdge).where(EntityEdge.source_node_id.in_(list(entity_ids)))
    ).all()
    edges = [e for e in candidate_edges if e.target_node_id in entity_ids]

    node_responses: list[GraphNodeResponse] = []
    for node in nodes:
        count = len(session.exec(
            select(DocumentEntity).where(DocumentEntity.entity_node_id == node.id)
        ).all())
        node_responses.append(GraphNodeResponse(
            id=node.id,
            entity_type=node.entity_type,
            entity_value=node.entity_value,
            normalized_value=node.normalized_value,
            document_count=count,
        ))

    edge_responses = [
        GraphEdgeResponse(
            id=e.id,
            source_node_id=e.source_node_id,
            target_node_id=e.target_node_id,
            relationship_type=e.relationship_type,
            strength=e.strength,
            document_count=e.document_count,
        )
        for e in edges
    ]

    return GraphResponse(nodes=node_responses, edges=edge_responses)
