from __future__ import annotations

from fastapi import APIRouter

from .routes.health import router as health_router
from .routes.documents import router as documents_router
from .routes.extraction import router as extraction_router
from .routes.history import router as history_router
from .routes.export import router as export_router
from .routes.signals import router as signals_router
from .routes.stats import router as stats_router


api_router = APIRouter()

api_router.include_router(health_router, tags=["health"])
api_router.include_router(documents_router, tags=["documents"])
api_router.include_router(extraction_router, tags=["extraction"])
api_router.include_router(history_router, tags=["history"])
api_router.include_router(export_router, tags=["export"])
api_router.include_router(signals_router, tags=["signals"])
api_router.include_router(stats_router, tags=["stats"])
