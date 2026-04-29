# SignalExtract AI — Product Positioning

SignalExtract AI is an **auditable signal extraction platform** for enterprise document intelligence. It turns messy, unstructured text into structured, evidence-linked outputs that can be reviewed and exported safely.

## Executive summary

Most document intelligence systems fail in enterprise settings for one of three reasons:
1. Outputs are not traceable to source evidence.
2. There is no review workflow and no governance control for downstream use.
3. Quality cannot be measured and regresses over time.

SignalExtract AI is positioned as a **customer-facing product** built around the enterprise requirement: **structured outputs + evidence + review + controlled export**.

## Technical differentiation

### 1) Evidence-first extraction contract
Every extracted signal includes:
- a normalized statement (`signal_text`)
- a verbatim supporting snippet (`evidence_text`)
- provenance fields (page/section/paragraph when available)

This enables audit trails, QA, and defensible decision-making.

### 2) Validation reduces unsupported outputs
Signals are validated for evidence grounding.
If evidence is missing/weak/mismatched:
- confidence is reduced
- the signal is routed to review

This is critical for operational and regulated environments.

### 3) Human-in-the-loop review is a first-class capability
Review is not an add-on. Review state is persisted and used for governance:
- approve/reject/needs clarification
- reviewer identity and note
- approval gates downstream export

### 4) Deterministic baseline with SaaS-ready extensibility
Default extraction is deterministic and testable.
LLM/hybrid extraction can be introduced behind the same interface while preserving:
- schema stability
- evidence requirements
- validation and review routing

This minimizes operational risk during adoption.

## Architecture rationale

SignalExtract AI separates concerns so production deployment is straightforward:
- API boundary: FastAPI service with explicit routes and operational endpoints
- Storage boundary: local storage for dev, object storage for production
- Database boundary: SQLite for local dev, Postgres for production
- Export boundary: stable JSON/CSV contracts for downstream systems

This architecture supports:
- repeatable deployments
- observability (health/readiness/metadata)
- scalable persistence (Neon Postgres)
- durable document storage (GCS)

Reference: [docs/architecture.md](architecture.md)

## Enterprise value proposition

### Operational document intelligence
Convert incident reports, postmortems, and runbooks into actionable signals:
- risks and mitigations
- recommended follow-ups
- action items and deadlines

### Regulated and audit-heavy workflows
Evidence-linked extraction enables:
- reviewer sign-off
- controlled exports
- traceability for compliance review

### Integration readiness
Approved-only exports are designed for:
- ticketing systems
- risk registers
- analytics pipelines
- downstream automation (with governance)

## Deployment model

SignalExtract AI is deployable as a SaaS-ready system:
- Backend API: Google Cloud Run
- Database: Neon PostgreSQL
- Object storage: Google Cloud Storage
- Frontend: Vercel (React) or Streamlit Cloud (Streamlit)

Deployment guidance: [docs/deployment.md](deployment.md)

## Quality as a release gate

The test suite and CI pipeline are treated as production quality gates:
- tests run on every push and pull request
- failures block releases
- coverage can be expanded to include contract tests and end-to-end workflow tests

## Roadmap alignment

The roadmap prioritizes:
1. high-trust extraction and governance
2. safe LLM augmentation behind validation and review
3. enterprise auth, RBAC, and multi-tenancy

See: [docs/enterprise_roadmap.md](enterprise_roadmap.md)
