from sqlmodel import Field, SQLModel


class CollectionDocument(SQLModel, table=True):
    collection_id: str = Field(foreign_key="collection.id", primary_key=True)
    document_id: str = Field(foreign_key="document.id", primary_key=True)
