from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from ...core.db import get_session
from ...core.security import verify_api_key
from ...models.document import Document
from ...models.entity_node import EntityNode
from ...models.entity_edge import EntityEdge
from ...models.document_entity import DocumentEntity
from ...schemas.graph import (
    GraphResponse, GraphNodeResponse, GraphEdgeResponse,
    EntityDetailResponse, EntityDocumentRef, EntityRelationship,
)
from ...services.knowledge_graph import build_document_graph

doc_router    = APIRouter(prefix="/documents", tags=["graph"])
entity_router = APIRouter(prefix="/entities",  tags=["graph"])


@doc_router.get("/{document_id}/graph", response_model=GraphResponse)
def get_document_graph(
    document_id: str,
    session: Session = Depends(get_session),
    _: None = Depends(verify_api_key),
):
    doc = session.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    build_document_graph(document_id, session)

    doc_entities = session.exec(
        select(DocumentEntity).where(DocumentEntity.document_id == document_id)
    ).all()

    if not doc_entities:
        return GraphResponse(nodes=[], edges=[])

    entity_ids = {de.entity_node_id for de in doc_entities}

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


@entity_router.get("/{entity_id}", response_model=EntityDetailResponse)
def get_entity_detail(
    entity_id: str,
    session: Session = Depends(get_session),
    _: None = Depends(verify_api_key),
):
    node = session.get(EntityNode, entity_id)
    if not node:
        raise HTTPException(status_code=404, detail="Entity not found")

    doc_entities = session.exec(
        select(DocumentEntity).where(DocumentEntity.entity_node_id == entity_id)
    ).all()

    documents: list[EntityDocumentRef] = []
    for de in doc_entities:
        doc = session.get(Document, de.document_id)
        if doc:
            documents.append(EntityDocumentRef(id=doc.id, filename=doc.original_filename))

    edges = session.exec(
        select(EntityEdge).where(
            (EntityEdge.source_node_id == entity_id) | (EntityEdge.target_node_id == entity_id)
        )
    ).all()

    entity_doc_count = len(doc_entities)
    entity_node_resp = GraphNodeResponse(
        id=node.id,
        entity_type=node.entity_type,
        entity_value=node.entity_value,
        normalized_value=node.normalized_value,
        document_count=entity_doc_count,
    )

    relationships: list[EntityRelationship] = []
    for edge in edges:
        partner_id = edge.target_node_id if edge.source_node_id == entity_id else edge.source_node_id
        partner = session.get(EntityNode, partner_id)
        if not partner:
            continue
        partner_count = len(session.exec(
            select(DocumentEntity).where(DocumentEntity.entity_node_id == partner_id)
        ).all())
        relationships.append(EntityRelationship(
            entity=GraphNodeResponse(
                id=partner.id,
                entity_type=partner.entity_type,
                entity_value=partner.entity_value,
                normalized_value=partner.normalized_value,
                document_count=partner_count,
            ),
            relationship_type=edge.relationship_type,
            strength=edge.strength,
            document_count=edge.document_count,
        ))

    return EntityDetailResponse(
        entity=entity_node_resp,
        documents=documents,
        relationships=relationships,
    )
