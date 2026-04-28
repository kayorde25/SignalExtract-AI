# Document Signal Extraction AI

This project demonstrates an AI/NLP pipeline for extracting meaningful structured signals from messy real-world documents, including clinical notes, reports, emails, and operational documents.

The system is designed to identify:

- Findings
- Recommendations
- Actions
- Clinical statements
- Operational statements
- Risks

Each extracted signal is linked back to its source text, making the output auditable and suitable for downstream review.

Frontend
React / Streamlit

Backend API
FastAPI

AI/NLP Layer
LLM extraction + validation

Document Processing
PDF/Text/Email parser

Database
PostgreSQL

File Storage
Local storage first, then S3/GCS

Deployment
Render / Railway / Fly.io / Google Cloud Run
