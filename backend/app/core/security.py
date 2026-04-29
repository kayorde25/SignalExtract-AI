from __future__ import annotations

from typing import Iterable

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.core.config import get_settings


def _allowed_paths(api_prefix: str) -> set[str]:
    # Always allow health/readiness + OpenAPI docs.
    return {
        f"{api_prefix}/health",
        f"{api_prefix}/ready",
        f"{api_prefix}/metadata",
        "/docs",
        "/openapi.json",
        "/redoc",
    }


def _extract_api_key(request: Request) -> str | None:
    # Preferred: X-API-Key
    key = request.headers.get("x-api-key")
    if key:
        return key.strip()

    # Fallback: Authorization: Bearer <key>
    auth = request.headers.get("authorization")
    if not auth:
        return None
    parts = auth.split(" ", 1)
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1].strip() or None
    return None


class ApiKeyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        settings = get_settings()

        if not settings.require_api_key:
            return await call_next(request)

        configured = settings.api_key.get_secret_value() if settings.api_key else None
        if not configured:
            return JSONResponse(
                status_code=500,
                content={"detail": "REQUIRE_API_KEY is enabled but API_KEY is not configured"},
            )

        if request.url.path in _allowed_paths(settings.api_v1_prefix):
            return await call_next(request)

        provided = _extract_api_key(request)
        if not provided or provided != configured:
            return JSONResponse(status_code=401, content={"detail": "Invalid or missing API key"})

        return await call_next(request)
