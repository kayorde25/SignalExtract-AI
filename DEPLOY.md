# Deploying SignalExtract AI to `signalextract-ai.com`

Topology:

| Piece | Host | URL |
|-------|------|-----|
| Frontend (Next.js, `web/`) | **Vercel** | `https://signalextract-ai.com` + `https://www.signalextract-ai.com` |
| Backend (FastAPI, `backend/`) | **Google Cloud Run** | `https://api.signalextract-ai.com` |
| Database | **Neon Postgres** | (connection string) |

The frontend never calls the backend directly from the browser — its `/api/*` routes proxy
server-side to `BACKEND_BASE_URL` and inject the API key. So only Vercel knows the backend URL + key.

---

## Part A — Backend → Cloud Run

1. **Deploy** (from repo root; uses `backend/Dockerfile`):
   ```bash
   gcloud run deploy signalextract-api \
     --source backend \
     --region europe-west1 \
     --allow-unauthenticated
   ```

2. **Set environment variables** (Cloud Run → Service → Edit → Variables, or `--set-env-vars`):
   ```
   DATABASE_URL        = postgresql://<neon connection string>   # NOT sqlite — see caveats
   CORS_ALLOW_ORIGINS  = https://signalextract-ai.com,https://www.signalextract-ai.com
   REQUIRE_API_KEY     = true
   API_KEY             = <a long random secret>
   EXTRACTION_MODE     = hybrid
   LLM_PROVIDER        = ollama
   LLM_ENDPOINT        = https://ollama.com
   LLM_MODEL           = gpt-oss:120b-cloud
   LLM_API_KEY         = <fresh Ollama Cloud key>
   STORAGE_TYPE        = gcs                       # durable file storage (not local disk)
   STORAGE_BUCKET      = signalextract-uploads     # create this bucket first (below)
   ```

   Create the bucket and grant the Cloud Run service account access (keyless via ADC):
   ```bash
   gcloud storage buckets create gs://signalextract-uploads --location europe-west1
   # grant the Cloud Run runtime service account object admin on the bucket
   gcloud storage buckets add-iam-policy-binding gs://signalextract-uploads \
     --member "serviceAccount:<PROJECT_NUMBER>-compute@developer.gserviceaccount.com" \
     --role roles/storage.objectAdmin
   ```
   (For S3/R2 instead, set `STORAGE_TYPE=s3`, `STORAGE_BUCKET`, and `S3_ENDPOINT_URL` + AWS creds.)

3. **Map the subdomain** (one-time domain verification in Google Search Console may be required):
   ```bash
   gcloud run domain-mappings create \
     --service signalextract-api \
     --domain api.signalextract-ai.com \
     --region europe-west1
   ```
   This prints a DNS record to add (a `CNAME` to `ghs.googlehosted.com.` for the `api` subdomain).

4. **Verify:** `https://api.signalextract-ai.com/api/v1/health` → `{"status":"ok",...}`

---

## Part B — Frontend → Vercel

1. **Import the repo** at vercel.com → New Project → import this GitHub repo.
2. **Root Directory:** set to `web` (the Next.js app lives in the subfolder).
3. **Framework preset:** Next.js (auto-detected). Build/Output defaults are correct.
4. **Environment Variables** (Project → Settings → Environment Variables, all environments):
   ```
   BACKEND_BASE_URL = https://api.signalextract-ai.com
   API_KEY          = <same secret as the backend's API_KEY>
   ```
5. **Deploy.** You'll get a `*.vercel.app` URL first; confirm it loads, then attach the domain.
6. **Add the domain:** Project → Settings → Domains → add `signalextract-ai.com` **and** `www.signalextract-ai.com`. Vercel shows the exact DNS records to create.

---

## Part C — DNS (at your domain registrar)

Add these records (use the exact values Vercel/Cloud Run show you — the ones below are the current defaults):

| Type | Name | Value | For |
|------|------|-------|-----|
| `A` | `@` (apex) | `76.76.21.21` | Vercel — apex |
| `CNAME` | `www` | `cname.vercel-dns.com.` | Vercel — www |
| `CNAME` | `api` | `ghs.googlehosted.com.` | Cloud Run — backend |

HTTPS certificates are issued automatically by Vercel and Cloud Run once DNS resolves (minutes to ~an hour).

---

## Part D — Verify end to end

1. `https://api.signalextract-ai.com/api/v1/health` → ok
2. `https://signalextract-ai.com` → landing page loads
3. `https://signalextract-ai.com/dashboard` → metrics load (proves the proxy → backend → DB path)
4. Upload a document → run extraction → review a signal (full round trip)

---

## Production caveats (important)

- **Database:** use **Neon Postgres**, not SQLite. Cloud Run's disk is ephemeral — a SQLite file is wiped on every cold start/redeploy. `psycopg2-binary` is already in `requirements.txt`.
- **File storage:** ✅ now pluggable — set `STORAGE_TYPE=gcs` (or `s3`) + `STORAGE_BUCKET` and uploads go to a durable bucket instead of ephemeral disk. Leave `STORAGE_TYPE=local` for local dev. On Cloud Run, GCS auth is keyless via the service account (Application Default Credentials).
- **Secrets:** the `API_KEY`, `LLM_API_KEY`, and Neon password should be set as Cloud Run / Vercel env vars (or Secret Manager) — never committed. Rotate any key that was shared in chat.
- **Cost:** Ollama Cloud is GPU-time metered with usage caps; `gpt-oss:120b-cloud` is the heaviest model. Drop to `qwen3.5:27b-cloud` if you hit limits.
