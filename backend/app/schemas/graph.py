from pydantic import BaseModel


class GraphNodeResponse(BaseModel):
    id: str
    entity_type: str
    entity_value: str
    normalized_value: str
    document_count: int = 1


class GraphEdgeResponse(BaseModel):
    id: str
    source_node_id: str
    target_node_id: str
    relationship_type: str
    strength: int
    document_count: int


class GraphResponse(BaseModel):
    nodes: list[GraphNodeResponse]
    edges: list[GraphEdgeResponse]


class EntityDocumentRef(BaseModel):
    id: str
    filename: str


class EntityRelationship(BaseModel):
    entity: GraphNodeResponse
    relationship_type: str
    strength: int
    document_count: int


class EntityDetailResponse(BaseModel):
    entity: GraphNodeResponse
    documents: list[EntityDocumentRef]
    relationships: list[EntityRelationship]
