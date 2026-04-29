from __future__ import annotations

import importlib
import os
from pathlib import Path

import pytest


@pytest.fixture(scope="session")
def test_env(tmp_path_factory: pytest.TempPathFactory):
    """Configure isolated env vars for tests before importing the app."""

    tmp_dir = tmp_path_factory.mktemp("signalextract")
    storage_dir = tmp_dir / "storage"
    storage_dir.mkdir(parents=True, exist_ok=True)

    db_path = tmp_dir / "test.db"

    os.environ["DATABASE_URL"] = f"sqlite:///{db_path.as_posix()}"
    os.environ["STORAGE_DIR"] = str(storage_dir)
    os.environ["REQUIRE_API_KEY"] = "false"
    os.environ["CORS_ALLOW_ORIGINS"] = "*"
    os.environ["EXTRACTION_MODE"] = "rule_based"

    return {"storage_dir": storage_dir, "db_path": db_path}


@pytest.fixture()
def client(test_env):
    # Import after env is set; then reload modules that cache settings/engine.
    from app.core import config as config_module

    config_module.get_settings.cache_clear()

    from app.core import db as db_module

    importlib.reload(db_module)

    from app import models  # noqa: F401

    # Ensure tables exist.
    db_module.init_db()

    from app.main import create_app

    app = create_app()

    from fastapi.testclient import TestClient

    return TestClient(app)
