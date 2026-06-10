from fastapi import APIRouter
from .routes import health, documents, extraction, signals, export, stats, history

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(documents.router)
api_router.include_router(extraction.router)
api_router.include_router(signals.router)
api_router.include_router(export.router)
api_router.include_router(stats.router)
api_router.include_router(history.router)
