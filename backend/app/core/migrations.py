from __future__ import annotations

from typing import Iterable

from sqlalchemy import text
from sqlalchemy.engine import Engine


def _existing_columns(engine: Engine, table_name: str) -> set[str]:
    with engine.connect() as conn:
        rows = conn.execute(text(f"PRAGMA table_info('{table_name}')")).fetchall()
    # row tuple: (cid, name, type, notnull, dflt_value, pk)
    return {r[1] for r in rows}


def _try_exec(engine: Engine, statements: Iterable[str]) -> None:
    with engine.connect() as conn:
        for stmt in statements:
            conn.execute(text(stmt))
        conn.commit()


def apply_sqlite_migrations(engine: Engine) -> None:
    """Best-effort schema upgrades for the local SQLite database.

    This repo intentionally avoids Alembic to keep onboarding easy.
    For production Postgres, use proper migrations.
    """

    # Only valid for SQLite.
    dialect = engine.url.get_backend_name()
    if dialect != "sqlite":
        return

    # Signals table incremental columns.
    cols = _existing_columns(engine, "signal")

    statements: list[str] = []

    if "validation_status" not in cols:
        statements.append("ALTER TABLE signal ADD COLUMN validation_status TEXT NOT NULL DEFAULT 'ok'")
    if "review_status" not in cols:
        statements.append("ALTER TABLE signal ADD COLUMN review_status TEXT NOT NULL DEFAULT 'pending'")
    if "reviewed_by" not in cols:
        statements.append("ALTER TABLE signal ADD COLUMN reviewed_by TEXT")
    if "reviewed_at" not in cols:
        statements.append("ALTER TABLE signal ADD COLUMN reviewed_at DATETIME")
    if "review_note" not in cols:
        statements.append("ALTER TABLE signal ADD COLUMN review_note TEXT")
    if "updated_at" not in cols:
        statements.append("ALTER TABLE signal ADD COLUMN updated_at DATETIME")

    if statements:
        _try_exec(engine, statements)
