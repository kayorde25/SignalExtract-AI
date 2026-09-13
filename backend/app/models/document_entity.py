from sqlmodel import Field, SQLModel


class DocumentEntity(SQLModel, table=True):
    document_id: str = Field(foreign_key="document.id", primary_key=True)
    entity_node_id: str = Field(foreign_key="entitynode.id", primary_key=True)
