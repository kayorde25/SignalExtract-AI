from sqlmodel import SQLModel
from .db import get_engine
from .logging import get_logger

logger = get_logger(__name__)


def run_migrations() -> None:
    from ..models import document, signal, extraction_run, audit_log, chunk, \
        entity_node, entity_edge, document_entity, collection, collection_document  # noqa: F401
    logger.info("Running database migrations")
    SQLModel.metadata.create_all(get_engine())
    logger.info("Migrations complete")
