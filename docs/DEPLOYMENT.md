# Deployment Guide

## Target Runtime
Production uses:
1. `frontend` -> Firebase Hosting
2. `api-service` -> Cloud Run
3. `worker-service` -> Cloud Run
4. `analysis-service` -> Cloud Run
5. PostgreSQL (managed)
6. Redis (managed)

## CI/CD Source Of Truth
Deployments are performed by GitHub Actions only:
- `.github/workflows/deploy-api-cloudrun.yml`
- `.github/workflows/deploy-worker-cloudrun.yml`
- `.github/workflows/deploy-analysis-cloudrun.yml`
- `.github/workflows/deploy-frontend-firebase.yml`

Cloud Run deploy workflows are serialized with a shared `concurrency` group to avoid quota spikes and race conditions.

## Required GitHub Configuration
### Repository secrets
- `GCP_SA_KEY`
- `FIREBASE_TOKEN`

### Repository variables
- `GCP_PROJECT_ID`
- `GCP_REGION`
- `GAR_REPOSITORY`
- `FIREBASE_PROJECT_ID`
- `VITE_API_URL`

## Required Runtime Env (Cloud Run services)
Set strong production values for:
- `JWT_SECRET`
- `WORKER_CALLBACK_SECRET`
- `GITHUB_WEBHOOK_SECRET`
- `GITHUB_APP_PRIVATE_KEY`
- `GITHUB_CLIENT_SECRET`

Set service endpoints and URLs:
- `DATABASE_URL`
- `REDIS_URL`
- `ANALYSIS_SERVICE_URL` (worker)
- `API_CALLBACK_URL` (worker -> api)
- `FRONTEND_URL` (api CORS + OAuth redirect target)
- `GITHUB_CALLBACK_URL` (api OAuth callback)

## Operational Notes
- Enable HTTPS everywhere.
- Keep `/internal/*` endpoints protected with shared secret.
- Scrape `/metrics` endpoints with Prometheus/Grafana.
- Route logs to centralized storage with correlation IDs.
