# Deploying SignalExtract AI to `signalextract-ai.com` (all on Cloud Run)

Both the frontend and backend run as **Cloud Run** services (free tier, scale-to-zero, no
non‑commercial restriction). The custom domain is attached with **Cloud Run domain mappings** — no other
provider involved.

| Piece | Host | URL |
|-------|------|-----|
| Frontend (Next.js, `web/`) | **Cloud Run** `signalextract-web` | `https://signalextract-ai.com` + `www` |
| Backend (FastAPI, `backend/`) | **Cloud Run** `signalextract-api` | `https://api.signalextract-ai.com` |
| Database | **Neon Postgres** | (connection string) |
| File storage | **Google Cloud Storage** bucket | (`STORAGE_BUCKET`) |

The browser only ever talks to the frontend. Its `/api/*` routes proxy **server-side** to the backend and
inject the API key — the backend URL + key are never exposed to the client.

> One-time setup: `gcloud auth login`, select the project (`gcloud config set project <PROJECT_ID>`), and
> enable the APIs:
> `gcloud services enable run.googleapis.com cloudbuild.googleapis.com storage.googleapis.com`

---

## Part A — Backend → Cloud Run

```bash
gcloud run deploy signalextract-api \
  --source backend \
  --region europe-west1 \
  --allow-unauthenticated
```

Set environment variables (Cloud Run → Service → Edit → Variables, or `--set-env-vars`):
```
DATABASE_URL        = postgresql://<neon connection string>    # NOT sqlite (see caveats)
CORS_ALLOW_ORIGINS  = https://signalextract-ai.com,https://www.signalextract-ai.com
REQUIRE_API_KEY     = true
API_KEY             = <a long random secret>
EXTRACTION_MODE     = hybrid
LLM_PROVIDER        = ollama
LLM_ENDPOINT        = https://ollama.com
LLM_MODEL           = gpt-oss:120b-cloud
LLM_API_KEY         = <fresh Ollama Cloud key>
STORAGE_TYPE        = gcs
STORAGE_BUCKET      = signalextract-uploads
```

Create the bucket + grant the Cloud Run service account access (keyless via ADC):
```bash
gcloud storage buckets create gs://signalextract-uploads --location europe-west1
gcloud storage buckets add-iam-policy-binding gs://signalextract-uploads \
  --member "serviceAccount:<PROJECT_NUMBER>-compute@developer.gserviceaccount.com" \
  --role roles/storage.objectAdmin
```

---

## Part B — Frontend → Cloud Run

The `web/` folder is container-ready (`Dockerfile` + `output: standalone`). Deploy it:
```bash
gcloud run deploy signalextract-web \
  --source web \
  --region europe-west1 \
  --allow-unauthenticated
```

Set environment variables:
```
BACKEND_BASE_URL = https://api.signalextract-ai.com
API_KEY          = <same secret as the backend's API_KEY>
```

Verify the temporary URL it prints (`https://signalextract-web-….run.app`) loads the app.

---

## Part C — Custom domain (Cloud Run domain mappings)

Verify domain ownership once (opens a browser flow, then add the TXT record it gives you):
```bash
gcloud domains verify signalextract-ai.com
```

Map each hostname to its service:
```bash
gcloud run domain-mappings create --service signalextract-web \
  --domain signalextract-ai.com      --region europe-west1   # apex → frontend
gcloud run domain-mappings create --service signalextract-web \
  --domain www.signalextract-ai.com  --region europe-west1   # www  → frontend
gcloud run domain-mappings create --service signalextract-api \
  --domain api.signalextract-ai.com  --region europe-west1   # api  → backend
```

Each command **prints the exact DNS records to add**. Google issues the SSL certificates automatically once
DNS resolves (minutes to ~an hour).

---

## Part D — DNS (at your registrar)

Use the exact values each `domain-mappings create` printed. They follow this shape:

| Type | Name | Value |
|------|------|-------|
| `A` (×4) + `AAAA` (×4) | `@` (apex) | the Google IPs Cloud Run prints |
| `CNAME` | `www` | `ghs.googlehosted.com.` |
| `CNAME` | `api` | `ghs.googlehosted.com.` |

---

## Part E — Verify end to end

1. `https://api.signalextract-ai.com/api/v1/health` → `{"status":"ok",...}`
2. `https://signalextract-ai.com` → landing page loads
3. `https://signalextract-ai.com/dashboard` → metrics load (frontend → proxy → backend → DB)
4. Add a file → Scan → check a result (full round trip; the file lands in the GCS bucket)

---

## Cost (low traffic ≈ free)

- **Cloud Run** free tier: 2M requests, 180k vCPU-sec, 360k GiB-sec, 1 GB egress / month — both services
  scale to zero, so idle = $0. Plus a $300 new-account credit.
- **Neon** has a free tier; **Ollama Cloud** is GPU-time metered (drop to `qwen3.5:27b-cloud` if you hit caps).
- No non-commercial restriction (unlike Vercel Hobby) — fine for a product you sell.

*Optional, for scale:* put a **Global External Application Load Balancer + Cloud CDN** in front of the
frontend service for edge caching — still all Google Cloud, no third party. Not needed at launch.

## Production caveats

- **Database:** use **Neon Postgres** (`DATABASE_URL`), not SQLite — Cloud Run disk is ephemeral. The schema
  auto-creates on first boot. `psycopg2-binary` is already in `requirements.txt`.
- **File storage:** set `STORAGE_TYPE=gcs` + `STORAGE_BUCKET` so uploads go to the durable bucket (not
  ephemeral disk). Keyless auth on Cloud Run via the service account.
- **Secrets:** set `API_KEY`, `LLM_API_KEY`, and the Neon password as Cloud Run env vars (or Secret Manager).
  Rotate anything that was shared in chat before going live.
