# SignalExtract AI — Architecture

SignalExtract AI is a production-style, auditable document signal extraction platform. The system extracts structured "signals" (findings, recommendations, actions, risks, key clinical statements, key operational statements) from messy documents while preserving evidence.

## Core idea: not simple parsing
This system does **not** just parse fields or summarize. It produces **structured outputs with evidence** so a reviewer can audit each extracted signal back to the source text.

## Layers

### 1) Ingestion layer
- Upload endpoint accepts: `.txt`, `.pdf`, `.docx`, `.eml`.
- Raw files are stored in a local `storage/` directory.
- SQLite stores metadata: filename, content type, file hash, size, storage path.

### 2) Text extraction layer
- Extracts **verbatim text** (no generation).
- PDF: extracts per page.
- DOCX: extracts per paragraph.
- EML: extracts subject + plain-text body.

### 3) Structure-aware chunking
Chunking aims to preserve evidence context:
- Uses paragraph boundaries and blank lines.
- Heuristically detects headings (short lines, ALL CAPS, lines ending with `:`).
- Tracks:
  - `source_page` (PDF)
  - `source_section` (inferred)
  - `paragraph_id`

### 4) Extraction layer (high recall)
- Baseline: deterministic rule-based extractor.
- Extracts candidates from sentences within each chunk.
- Emits multiple signal types per sentence when relevant (e.g., both `risk` and `operational_statement`).

### 5) Schema-based normalization
Each signal is normalized into a stable schema:
- type + text
- subject/action heuristics
- urgency/certainty/explicitness

### 6) Evidence linking
Every signal includes `evidence_text` plus provenance:
- document
- page/section/paragraph

### 7) Validation layer
Validation reduces hallucination risk:
- evidence must be present
- signal must be grounded in evidence
- confidence clamped to `[0, 1]`
- low confidence ⇒ `needs_review=true`

### 8) Human review loop
Signals are flagged for review when:
- `confidence < REVIEW_THRESHOLD`, or
- `explicitness == implied`

### 9) Export layer
- JSON export for downstream systems
- CSV export for analysts and QA workflows

## Production deployment architecture (target)
Text diagram:

Client (Vercel)
  → Frontend (Streamlit or React)
  → Backend API (Cloud Run)
  → Storage (GCS bucket)
  → Database (Neon Postgres)
  → Observability (logs/metrics/traces)

The local dev implementation mirrors this with:
- local storage directory
- SQLite database
