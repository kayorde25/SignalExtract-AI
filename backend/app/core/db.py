from __future__ import annotations

from collections.abc import Generator

from sqlmodel import SQLModel, Session, create_engine

from .config import get_settings
from .migrations import apply_sqlite_migrations


def _create_engine():
    settings = get_settings()

    # SQLite needs `check_same_thread=False` for FastAPI concurrency.
    connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
    return create_engine(settings.database_url, echo=False, connect_args=connect_args)


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
