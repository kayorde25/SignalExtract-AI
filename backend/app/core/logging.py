from __future__ import annotations

import logging

from .config import get_settings


def configure_logging() -> None:
    """Configure app-wide logging.

    Keep it simple and compatible with Uvicorn/Gunicorn logging in production.
    """

    settings = get_settings()

    level = getattr(logging, settings.log_level.upper(), logging.INFO)
    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )

    # Reduce noisy loggers unless the user opts in via LOG_LEVEL=DEBUG.
    if level > logging.DEBUG:
        logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
