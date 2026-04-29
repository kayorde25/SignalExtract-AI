# SignalExtract AI — Enterprise Roadmap

This roadmap outlines the planned evolution of SignalExtract AI from core extraction to a multi-tenant, SaaS-ready enterprise platform.

## Phase 1: Core extraction platform

Objective: deliver a high-trust extraction platform with governance-ready outputs.

Key deliverables:
- Evidence-linked signal schema with stable export contracts
- Deterministic extraction mode as default behavior
- Validation and confidence routing (`needs_review`)
- Human review workflow with persisted decisions
- Approved-only export paths for downstream integration
- Operational endpoints (health/readiness/metadata)
- CI-based quality gates (pytest on PR/push)

## Phase 2: LLM/hybrid extraction

Objective: increase recall and normalization quality while preserving auditability.

Key deliverables:
- LLM extraction behind schema-constrained outputs
- Hybrid mode combining deterministic + LLM extraction with dedupe
- Strict evidence grounding requirements for any generative outputs
- Safer fallbacks to deterministic extraction when the LLM is unavailable
- Expanded evaluation harness (precision/recall/F1 + evidence-support metrics)

## Phase 3: enterprise auth and RBAC

Objective: secure access control aligned with enterprise identity systems.

Key deliverables:
- Organization/user model
- Role-based access control (admin, reviewer, analyst, read-only)
- SSO integration (OIDC/SAML) for enterprise identity providers
- API authentication and authorization policies
- Audit coverage for auth and privileged operations

## Phase 4: audit/compliance dashboards

Objective: provide operational and compliance visibility for customers.

Key deliverables:
- Audit log query and export (by document, user, action, time range)
- Compliance dashboards (review rates, approval rates, validation failures)
- Alerts for anomalies (e.g., high evidence-weak rate, elevated error rate)
- Data retention policies and export controls

## Phase 5: customer onboarding and multi-tenant SaaS

Objective: deliver a scalable SaaS-ready system with tenant isolation.

Key deliverables:
- Multi-tenant data isolation model
- Tenant-scoped configuration and policy controls
- Customer onboarding flows (workspace creation, roles, API keys)
- Usage metering and quotas
- Operational tooling for support (tenant diagnostics, safe log access)
