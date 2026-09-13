from fastapi import APIRouter
from .routes import health, documents, extraction, signals, export, stats, history, retrieval, comparison, graph, collections

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(comparison.router)  # before documents/export to avoid /{doc_id} catch-all conflicts
api_router.include_router(graph.doc_router)   # before documents.router — same reason
api_router.include_router(graph.entity_router)
api_router.include_router(collections.router)
api_router.include_router(documents.router)
api_router.include_router(extraction.router)
api_router.include_router(signals.router)
api_router.include_router(export.router)
api_router.include_router(stats.router)
api_router.include_router(history.router)
api_router.include_router(retrieval.router)
