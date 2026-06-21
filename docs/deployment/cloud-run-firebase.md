# Deployment Guide

Production deployment is driven by GitHub Actions. The deploy workflows run after the `CI` workflow succeeds on `main`, or manually through `workflow_dispatch`.

## Targets

| Component | Target | Workflow |
|---|---|---|
| Frontend | Firebase Hosting | `.github/workflows/deploy-frontend-firebase.yml` |
| API service | Cloud Run `codesentry-api` | `.github/workflows/deploy-api-cloudrun.yml` |
| GitHub service | Cloud Run `codesentry-github` | `.github/workflows/deploy-github-cloudrun.yml` |
| Analysis service | Cloud Run `codesentry-analysis` | `.github/workflows/deploy-analysis-cloudrun.yml` |

Backend images are pushed to Google Artifact Registry. Runtime secrets are injected from GCP Secret Manager and GitHub Actions secrets.

## Release Flow

1. A push lands on `main`.
2. `CI` runs security scans, tests, audits, and Docker builds.
3. Each deploy workflow starts only if `CI` succeeded.
4. Each workflow path-filters changes and skips if its component did not change.
5. Backend workflows authenticate to Google Cloud with Workload Identity Federation.
6. Backend workflows build and push service images to Artifact Registry.
7. The API workflow runs database migrations from the release image.
8. Cloud Run or Firebase Hosting is deployed.
9. Each workflow runs a smoke check against `/health` or the public frontend URL.

The three Cloud Run workflows share the `cloudrun-deploy` concurrency group with `cancel-in-progress: false`, so backend deploys are serialized.

## Required GitHub Repository Variables

Shared Google Cloud variables:

- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_SERVICE_ACCOUNT_EMAIL`
- `GCP_PROJECT_ID`
- `GCP_REGION`
- `GAR_REPOSITORY`

Application URL variables:

- `CODESENTRY_FRONTEND_URL`
- `CODESENTRY_GH_SERVICE_URL`
- `CODESENTRY_ANALYSIS_URL`

Frontend variables:

- `FIREBASE_PROJECT_ID`

## Required GitHub Repository Secrets

- `FIREBASE_TOKEN`
- `CODESENTRY_INTERNAL_SECRET`
- `CODESENTRY_WEBHOOK_SECRET`

`CODESENTRY_INTERNAL_SECRET` is deployed as:

- `GITHUB_SERVICE_INTERNAL_SECRET` on the API and GitHub service.
- `ANALYSIS_SERVICE_INTERNAL_SECRET` on the analysis service.

## Required GCP Secret Manager Secrets

API service:

- `codesentry-jwt-secret`
- `codesentry-encryption-key`
- `codesentry-database-url`
- `codesentry-github-app-id`
- `codesentry-github-app-private-key`
- `codesentry-webhook-secret`
- `codesentry-github-client-id`
- `codesentry-github-client-secret`

GitHub service:

- `codesentry-database-url`
- `codesentry-github-app-id`
- `codesentry-github-app-private-key`

Analysis service:

- `codesentry-gemini-api-key`

The API deploy workflow also reads `codesentry-database-url` before deployment so it can run `npm run db:migrate` from the release image.

## Cloud Run Runtime Env

API service deploys with:

- `NODE_ENV=production`
- `FRONTEND_URL=${CODESENTRY_FRONTEND_URL}`
- `GITHUB_SERVICE_URL=${CODESENTRY_GH_SERVICE_URL}`
- `ANALYSIS_SERVICE_URL=${CODESENTRY_ANALYSIS_URL}`
- `GITHUB_CALLBACK_URL=${CODESENTRY_FRONTEND_URL}/auth/github/callback`
- `GITHUB_APP_SLUG=mitig8it`
- `GITHUB_SERVICE_INTERNAL_SECRET=${CODESENTRY_INTERNAL_SECRET}`

GitHub service deploys with:

- `NODE_ENV=production`
- `FRONTEND_URL=${CODESENTRY_FRONTEND_URL}`
- `GITHUB_SERVICE_INTERNAL_SECRET=${CODESENTRY_INTERNAL_SECRET}`
- `WEBHOOK_SECRET=${CODESENTRY_WEBHOOK_SECRET}`

Analysis service deploys with:

- `FRONTEND_URL=${CODESENTRY_FRONTEND_URL}`
- `ANALYSIS_SERVICE_INTERNAL_SECRET=${CODESENTRY_INTERNAL_SECRET}`

## Database Migrations

The API deployment is responsible for production database migrations:

```text
docker run --rm \
  -e DATABASE_URL="$DATABASE_URL" \
  -e NODE_ENV=production \
  "$IMAGE" \
  npm run db:migrate
```

Do not rely on service startup to mutate production schema. Keep schema changes in the API migration path and verify them before deployment.

## Path Filters

Deploy workflows skip unchanged components:

- API deploys for changes under `services/api-service/`, `proto/`, or its workflow file.
- GitHub service deploys for changes under `services/github-service/`, `proto/`, or its workflow file.
- Analysis service deploys for changes under `services/analysis-service/`, `proto/`, or its workflow file.
- Frontend deploys for changes under `frontend/`, `firebase.json`, or its workflow file.

Manual `workflow_dispatch` bypasses these filters and deploys the selected component.

## Smoke Checks

- API: Cloud Run service URL + `/health`
- GitHub service: Cloud Run service URL + `/health`
- Analysis service: Cloud Run service URL + `/health`
- Frontend: `CODESENTRY_FRONTEND_URL` when configured

## Analysis Queue Wakeup

The API uses a DB-backed analysis queue. Because the API service can scale to zero, configure Cloud Scheduler to periodically wake the queue worker through the authenticated internal tick endpoint:

```bash
API_URL="$(gcloud run services describe codesentry-api \
  --project "$GCP_PROJECT_ID" \
  --region "$GCP_REGION" \
  --format='value(status.url)')"

gcloud scheduler jobs create http mitig8it-analysis-queue-tick \
  --project "$GCP_PROJECT_ID" \
  --location "$GCP_REGION" \
  --schedule="* * * * *" \
  --uri="${API_URL}/internal/analysis-queue/tick" \
  --http-method=POST \
  --headers="x-internal-secret=${CODESENTRY_INTERNAL_SECRET}"
```

The endpoint returns current queue stats and requires `x-internal-secret`. Keep the scheduler secret aligned with `GITHUB_SERVICE_INTERNAL_SECRET` on the API service.

## Operational Notes

- Keep Cloud Run service URLs aligned with the GitHub App callback and webhook configuration.
- Keep `CODESENTRY_INTERNAL_SECRET` consistent across API, GitHub service, and analysis service.
- Metrics endpoints require `x-internal-secret` in production.
- The API service is deployed with `--min-instances 0` for cost control; Cloud Scheduler should wake the analysis queue.
- The deploy workflows currently use `--allow-unauthenticated`; application-level secrets protect internal API paths.
- Rotate GitHub App private keys, OAuth secrets, webhook secrets, JWT secret, encryption key, and internal service secret through GitHub/GCP secret stores, not code.
