# SignalExtract AI — Product Walkthrough

SignalExtract AI is an **operational document intelligence** and **auditable signal extraction** platform. It converts unstructured documents into evidence-linked, reviewable signals that are safe to export into downstream systems.

This walkthrough covers the end-to-end customer workflow: ingest → extract → validate → review → export.

## 1) Access and environment

SignalExtract AI is typically deployed as:
- Backend API on **Google Cloud Run**
- Database on **Neon PostgreSQL**
- Object storage on **Google Cloud Storage**
- Frontend on **Vercel** (React) or **Streamlit Cloud** (admin console)

In any environment, the platform exposes operational endpoints:
- Health: `/api/v1/health`
- Readiness: `/api/v1/ready`
- Metadata: `/api/v1/metadata` (non-secret config snapshot)

## 2) Upload a document (ingestion)

Upload a document through the UI or directly to the API.

What ingestion does:
- Stores the raw file in the configured storage layer
- Computes a content hash (for traceability)
- Persists document metadata (filename, type, size, hash, storage pointer)

Operational controls:
- Allowed file extensions (configured)
- Maximum upload size (configured)

## 3) Extract text and structure-aware chunks

SignalExtract AI extracts **verbatim text** and produces **structure-aware chunks**.

Why chunks matter:
- Each signal must be grounded in a specific source span
- Chunks preserve provenance fields such as page/section/paragraph identifiers

API:
- `POST /api/v1/documents/{document_id}/extract-text`

## 4) Extract signals (auditable outputs)

Run the extraction pipeline to generate signals (findings, recommendations, actions, risks, and key domain statements).

Signals include:
- `signal_text` (normalized statement)
- `evidence_text` (verbatim supporting snippet)
- provenance (document + page/section/paragraph when available)
- `confidence` and `needs_review`

Default behavior is deterministic and evidence-first. If an LLM or hybrid extraction mode is enabled for your deployment, the platform still enforces the same evidence and validation contract.

API:
- `POST /api/v1/documents/{document_id}/extract-signals`

## 5) Evidence validation and review routing

Every extracted signal is validated for evidence grounding.

If evidence is missing or weak:
- confidence is reduced
- `needs_review` is set to true

This ensures ambiguous or unsupported outputs are routed to human review rather than exported downstream.

## 6) Human review (governance)

Reviewers can approve, reject, or request clarification on individual signals.

Review decisions are persisted:
- review status
- reviewer identity (optional)
- timestamp
- note

API:
- `PATCH /api/v1/signals/{signal_id}/review`

## 7) Export (approved-only)

Exports are designed for safe downstream integration.

Two export classes are supported:
- All extracted signals (for QA and internal analysis)
- Approved-only exports (for customer workflows and system integrations)

API:
- `GET /api/v1/documents/{document_id}/export.json`
- `GET /api/v1/documents/{document_id}/export.csv`
- `GET /api/v1/documents/{document_id}/export-approved.json`
- `GET /api/v1/documents/{document_id}/export-approved.csv`

## 8) Operational visibility

Operators can validate system health, readiness, and configuration without exposing secrets:
- `/api/v1/health` verifies service availability
- `/api/v1/ready` verifies database connectivity and storage availability
- `/api/v1/metadata` provides a non-secret runtime configuration snapshot

## 9) Production deployment checklist

For a production deployment:
- Configure CORS allowlist for the frontend origin
- Enable API key enforcement for the backend API if required
- Use Neon PostgreSQL for database durability and concurrency
- Use Google Cloud Storage for durable document storage
- Run CI on every change as a release gate (tests must pass)

Deployment guidance: [docs/deployment.md](deployment.md)
