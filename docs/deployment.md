# SignalExtract AI — Deployment

This repo supports local development first, with a clear path to production.

## Local deployment
- Backend: FastAPI + SQLite
- Frontend: Streamlit
- Storage: local `storage/` directory

## Docker deployment
- `docker-compose.yml` starts backend and frontend.
- SQLite and uploads are mounted as volumes.

## Cloud Run backend deployment (target)
High-level plan:
1. Containerize backend (already supported via `backend/Dockerfile`).
2. Deploy to Google Cloud Run.
3. Configure environment variables:
   - `DATABASE_URL` (Neon)
   - `STORAGE_DIR` (local path inside container for temp)
   - `LOG_LEVEL`
4. Use Cloud Storage (GCS) for durable document storage.
   - Store file path/URL in DB.

## Vercel frontend deployment (target)
Two options:
- Keep Streamlit (deploy separately), or
- Replace Streamlit with React hosted on Vercel.

Frontend should talk to the Cloud Run API via HTTPS.

## Future PostgreSQL + GCS integration
- Swap SQLite `DATABASE_URL` with Neon Postgres connection string.
- Replace local `storage/` with GCS client:
  - upload on ingest
  - read for extraction
- Add async jobs:
  - push extraction tasks to a queue (e.g., Cloud Tasks)
  - worker processes do PDF parsing + extraction

## Production hardening checklist
- auth (API keys / OAuth)
- request size limits + rate limiting
- structured logging and tracing
- background job system for long PDFs
- persistent object storage + lifecycle policies
- migrations (Alembic) when moving to Postgres
