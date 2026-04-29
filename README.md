# SignalExtract AI

[![SignalExtract AI CI](https://github.com/kayorde25/SignalExtract-AI/actions/workflows/backend-tests.yml/badge.svg)](https://github.com/kayorde25/SignalExtract-AI/actions/workflows/backend-tests.yml)

SignalExtract AI is an **enterprise document intelligence platform** for **auditable signal extraction**.

It converts unstructured documents (PDFs, emails, reports, clinical notes, operational runbooks) into **structured signals** (findings, recommendations, actions, risks, key clinical statements, key operational statements) while preserving **verbatim evidence** and provenance.

## Production deployment
- Production deployment URL: provide your Cloud Run / Vercel URL here once deployed.
- Deployment guidance: [docs/deployment.md](docs/deployment.md)

## Enterprise Product Overview
SignalExtract AI is designed for customer-facing workflows where extracted information must be:
- **traceable** to the source text (evidence-first)
- **reviewable** by humans (governance before downstream automation)
- **measurable** over time (quality metrics and regression protection)

## Core Product Capabilities
- Evidence-linked structured signals with provenance (document + page/section/paragraph when available)
- Confidence scoring with `needs_review` routing for ambiguous or low-confidence items
- Evidence validation (grounding checks) to reduce unsupported outputs
- Human-in-the-loop review workflow (approve/reject/needs clarification + who/when/note)
- Approved-only export endpoints for controlled downstream integration
- Audit event logging for high-signal product events
- Operational endpoints: health/readiness + non-secret runtime metadata snapshot

## Target Use Cases
- Operational document intelligence: incident reports, postmortems, runbooks, SOPs
- Clinical and regulated workflows: clinical note QA, evidence review, review queues
- Risk and compliance: policy reviews, audit preparation, evidence-backed registers
- Customer support and ops: extracting actions/risks/findings from emails and tickets

## Customer Workflow
1. Upload a document.
2. Extract text and structure-aware chunks.
3. Run signal extraction (deterministic baseline; pluggable LLM/hybrid paths).
4. Validate evidence grounding and compute confidence.
5. Review signals and record decisions.
6. Export approved-only JSON/CSV to downstream systems.

Walkthrough: [docs/product_walkthrough.md](docs/product_walkthrough.md)
Positioning: [docs/product_positioning.md](docs/product_positioning.md)

## Enterprise Readiness
- CI runs `pytest` on push and pull requests as a production quality gate
- Environment-driven configuration (no hard-coded secrets)
- Predictable runtime behavior (deterministic extraction mode by default)
- Clear boundaries for API, storage, database, and export
- Best-effort SQLite upgrade helper for local dev; production migrations expected for Postgres

## Security and Governance
- Optional API key enforcement for the HTTP API (middleware)
- Upload constraints (file size limit + allowed extensions)
- CORS allowlist support for production deployments
- Review and approval metadata persisted per signal
- Approved-only exports to prevent unreviewed outputs from being shipped
- Audit log table for traceability (append-only business events)

## Deployment Architecture
SignalExtract AI is deployable as a SaaS-ready system:
- Backend API: **Google Cloud Run** (containerized FastAPI)
- Database: **Neon PostgreSQL** (swap `DATABASE_URL`)
- Object storage: **Google Cloud Storage** (replace local `STORAGE_DIR` with a GCS-backed storage service)
- Frontend: **Vercel** (React) or **Streamlit Cloud** (Streamlit admin console)

Reference architecture: [docs/architecture.md](docs/architecture.md)

## Roadmap
Enterprise roadmap: [docs/enterprise_roadmap.md](docs/enterprise_roadmap.md)

## Why this is not simple parsing
This project is explicitly **not** a simple parser or summarizer.

For every extracted signal, the system returns:
- the normalized signal (`signal_text`)
- a verbatim supporting snippet (`evidence_text`)
- provenance metadata (document + page/section/paragraph when available)
- a confidence score and `needs_review` flag

This makes outputs **auditable** and suitable for downstream human review, QA, and integration.

## Architecture (text diagram)
```
Browser
	└─ Frontend (Streamlit; future React/Vercel)
				└─ HTTP
						└─ Backend API (FastAPI)
								 ├─ Ingestion + storage (local ./storage; future GCS)
								 ├─ Text extraction (.txt/.pdf/.docx/.eml)
								 ├─ Structure-aware chunking (page/section/paragraph)
								 ├─ Signal extraction (high-recall baseline)
								 ├─ Validation + confidence scoring + review flag
								 └─ Database (SQLite; future Neon Postgres)
```

## Pipeline (end-to-end)
1. **Document ingestion**: upload + metadata stored.
2. **Text extraction**: verbatim extraction for `.txt`, `.pdf`, `.docx`, `.eml`.
3. **Structure-aware chunking**: preserve page/section/paragraph context for evidence.
4. **High-recall candidate extraction**: rule-based baseline extracts candidates from sentences.
5. **Schema-based normalization**: normalize into a stable signal schema.
6. **Evidence linking**: attach exact source snippet + provenance fields.
7. **Confidence scoring**: deterministic scoring based on explicit cues.
8. **Validation checks**: enforce evidence grounding and clamp confidence.
9. **Human review flag**: mark `needs_review=true` for low-confidence or implied signals.

Details: see [docs/architecture.md](docs/architecture.md).

## Features
- Upload documents: `.txt`, `.pdf`, `.docx`, `.eml`
- Extract raw text + structure-aware chunks
- Extract auditable signals:
	- `finding`
	- `recommendation`
	- `action`
	- `risk`
	- `clinical_statement`
	- `operational_statement`
- Evidence linking + provenance
- Confidence scoring + review workflow
- SQLite persistence (documents + extraction runs + signals)
- Export JSON + CSV

## Tech stack
- Backend: FastAPI, SQLModel (SQLite default)
- Frontend: Streamlit
- Document extraction: pdfplumber (PDF), python-docx (DOCX), stdlib email parser (EML)

Deployment targets:
- Google Cloud Run
- Neon PostgreSQL
- Google Cloud Storage
- Vercel or Streamlit Cloud

## Quality Gates
- CI: GitHub Actions runs `pytest` on push and pull requests
- Local: `cd backend && python -m pytest -q`

## API endpoints
Base URL: `http://localhost:8000/api/v1`

- `GET  /health`
- `GET  /ready`
- `GET  /metadata`
- `POST /documents/upload` (multipart form-data `file`)
- `GET  /documents/{document_id}`
- `POST /documents/{document_id}/extract-text`
- `POST /documents/{document_id}/extract-signals`
- `GET  /documents/{document_id}/signals`
- `GET  /history`
- `GET  /documents/{document_id}/export.json`
- `GET  /documents/{document_id}/export.csv`
- `GET  /documents/{document_id}/export.approved.json`
- `GET  /documents/{document_id}/export.approved.csv`

## How to run locally

### 1) Backend (FastAPI)
From the repo root:

```bash
cd backend
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

### 2) Frontend (Streamlit)
In a second terminal:

```bash
cd frontend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
streamlit run streamlit_app.py --server.port 8501
```

Open: `http://localhost:8501`

## How to run with Docker
1. Copy `.env.example` to `.env` (optional) and adjust.
2. Run:

```bash
docker compose up --build
```

- Backend: `http://localhost:8000/api/v1/health`
- Frontend: `http://localhost:8501`

## Example input
Synthetic sample documents are included:
- [sample_documents/clinical_note.txt](sample_documents/clinical_note.txt)
- [sample_documents/ops_report.txt](sample_documents/ops_report.txt)
- [sample_documents/email.eml](sample_documents/email.eml)

## Example output
Examples are included:
- [outputs/example_output.json](outputs/example_output.json)
- [outputs/example_output.csv](outputs/example_output.csv)

## Evaluation approach (precision, recall, F1)
Signal extraction is designed to be measurable:
- Create gold labels with evidence spans.
- Compute precision/recall/F1 per signal type.
- Track hallucination rate / evidence-support accuracy.

See [docs/evaluation.md](docs/evaluation.md).

## Screenshots
Customer-facing documentation screenshots live in [screenshots/README.md](screenshots/README.md).
