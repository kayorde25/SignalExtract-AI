# Deploying Frontend to Google Cloud Run

## Prerequisites
- Google Cloud SDK (`gcloud`) installed and authenticated
- Billing enabled and a project selected
- Artifact Registry or Container Registry enabled

## Build and Deploy

1. **Build and Push Image** (Cloud Build):

```sh
gcloud builds submit --tag gcr.io/PROJECT_ID/signalextract-frontend frontend/
```

2. **Deploy to Cloud Run:**

```sh
gcloud run deploy signalextract-frontend \
  --image gcr.io/PROJECT_ID/signalextract-frontend \
  --platform managed \
  --region REGION \
  --allow-unauthenticated
```

Replace `PROJECT_ID` and `REGION` with your GCP project and region.

## Notes
- The Dockerfile and .dockerignore are already set up for Cloud Run.
- Environment variables can be set with `--set-env-vars`.
- For persistent storage, use GCP services (Cloud SQL, GCS, etc.).
