from __future__ import annotations

from collections.abc import Generator
import logging

from sqlmodel import SQLModel, Session, create_engine

from .config import get_settings
from .migrations import apply_sqlite_migrations


logger = logging.getLogger(__name__)


def _create_engine():
    settings = get_settings()

    url = settings.database_url

    def _engine_for(db_url: str):
        # SQLite needs `check_same_thread=False` for FastAPI concurrency.
        connect_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {}
        return create_engine(db_url, echo=False, connect_args=connect_args)

    try:
        return _engine_for(url)
    except ModuleNotFoundError as e:
        # Common local failure: DATABASE_URL=postgresql://... but psycopg/psycopg2 isn't installed.
        missing = str(e)
        if url.startswith("postgres") and ("psycopg2" in missing or "psycopg" in missing):
            fallback = "sqlite:///./cleanextract.db"
            logger.warning("Postgres driver missing (%s); falling back to %s", missing, fallback)
            return _engine_for(fallback)
        raise
    except Exception as e:
        # SQLAlchemy may raise non-ModuleNotFound errors for missing dialect modules.
        msg = str(e).lower()
        if url.startswith("postgres") and ("psycopg" in msg or "psycopg2" in msg or "dialect" in msg):
            fallback = "sqlite:///./cleanextract.db"
            logger.warning("Database engine init failed (%s); falling back to %s", e, fallback)
            return _engine_for(fallback)
        raise


engine = _create_engine()


def init_db() -> None:
    """Create tables if they do not exist."""

    SQLModel.metadata.create_all(engine)
    # Best-effort migration for the local SQLite DB.
    apply_sqlite_migrations(engine)


def get_session() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a DB session."""

    with Session(engine) as session:
        yield session
