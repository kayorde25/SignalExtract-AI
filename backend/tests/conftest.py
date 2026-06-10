import os

# Override DATABASE_URL before any app module is imported so pydantic settings
# picks up sqlite instead of whatever is in .env (e.g. production PostgreSQL).
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["REQUIRE_API_KEY"] = "false"
os.environ["STORAGE_DIR"] = "/tmp/signalextract_test"

import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine
from sqlmodel.pool import StaticPool

# Clear settings cache so DATABASE_URL override takes effect.
from app.core import config as _config
_config.get_settings.cache_clear()

import app.core.db as _db  # noqa: E402 — must come after cache_clear
from app.main import app
from app.core.db import get_session


@pytest.fixture(name="session")
def session_fixture():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    _db._engine = engine  # patch module-level engine used by migrations
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    _db._engine = None


@pytest.fixture(name="client")
def client_fixture(session: Session):
    def _override():
        return session

    app.dependency_overrides[get_session] = _override
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()
