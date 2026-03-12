# CodeSentry Project Architecture

## Overview
CodeSentry is a GitHub-native AI security reviewer for pull requests.  
The active V1 runtime path is:

- `frontend` (React/Vite dashboard)
- `api-service` (Node/Express control plane + webhook ingest)
- `worker-service` (BullMQ async orchestration worker)
- `analysis-service` (FastAPI deterministic analysis engine)
- `postgres` (system of record)
- `redis` (queue backend/cache)

Primary runtime wiring is defined in `docker-compose.yml`.

## Service Responsibilities

### Frontend (`frontend/`)
- Handles dashboard UX, routing, and authenticated views.
- Calls API endpoints for repositories, PRs, findings, suppressions, and auth/session.

### API Service (`services/api-service/`)
- GitHub OAuth login/session (`/auth/*`).
- GitHub webhook ingestion (`/webhooks/github`) with signature verification.
- Webhook idempotency using `webhook_deliveries.delivery_id`.
- Upserts repositories and pull request records.
- Creates `analysis_runs` and enqueues `pr-analysis` jobs in BullMQ.
- Exposes authenticated dashboard APIs for repositories/PRs/findings/suppressions.
- Accepts internal worker callbacks at `/internal/analysis-runs/:id/complete` (HMAC-protected).

### Worker Service (`services/worker-service/`)
- Consumes BullMQ queue `pr-analysis`.
- Fetches changed PR files from GitHub using installation token.
- Calls analysis-service `POST /analyze/pr`.
- Normalizes findings, computes fingerprints, and upserts to Postgres.
- Applies suppression and baseline logic.
- Marks stale findings as fixed.
- Publishes GitHub summary comment, high-confidence inline comments, and check-runs.
- Calls API internal endpoint to finalize `analysis_runs` status/counts.

### Analysis Service (`services/analysis-service/`)
- Accepts changed-file payloads for PR analysis.
- Runs deterministic rule-based security checks on patch content.
- Runs dependency risk pattern checks.
- Conditionally includes LLM prompt-injection rules when repo context indicates LLM usage.
- Deduplicates findings by fingerprint and returns normalized finding objects.

## Data and Persistence

### PostgreSQL (canonical data model)
Key tables:
- `installations`
- `users`
- `repositories`
- `pull_requests`
- `analysis_runs`
- `findings`
- `suppressions`
- `audit_logs`
- `webhook_deliveries`

Core behaviors:
- Webhook idempotency via unique `delivery_id`.
- Finding dedupe via unique `(repository_id, fingerprint)`.
- Finding lifecycle states: `open`, `dismissed`, `accepted_risk`, `fixed`.
- Baseline mode via `repositories.baseline_set` and `findings.is_baseline`.

### Redis
- BullMQ queue transport/state for async PR analysis jobs.

## End-to-End Flow
1. GitHub sends a `pull_request` webhook to API.
2. API verifies webhook signature and deduplicates by delivery ID.
3. API upserts repository/PR data, inserts `analysis_runs` row, enqueues analysis job.
4. Worker consumes job and fetches changed files from GitHub.
5. Worker calls analysis-service with PR metadata + file patches.
6. Analysis-service returns normalized findings.
7. Worker upserts findings, applies suppressions/baseline, marks fixed findings.
8. Worker posts summary + inline comments (high confidence) + check-run to GitHub.
9. Worker calls API internal completion endpoint.
10. API marks run completed/failed and records audit log entries.
11. Frontend reads stored runs/findings/repositories via API.

## Security Controls
- Webhook HMAC validation (`GITHUB_WEBHOOK_SECRET`).
- Worker internal callback HMAC validation (`WORKER_CALLBACK_SECRET`).
- JWT-based auth for dashboard APIs.
- Confidence-gated GitHub comment strategy to reduce noise.

## Observability
- `/health` endpoints across services.
- `/metrics` endpoints for Prometheus-style scraping.
- Correlation IDs in API request flow.
- Structured logging in API and worker paths.

## Deployment Model
- Local development: Docker Compose (`postgres`, `redis`, `api-service`, `worker-service`, `analysis-service`, `frontend`).
- Production model: independently deployed containers/services with the same env contract, managed Postgres/Redis, and separately hosted frontend.

## Repo Note: Legacy/Parallel Components
The repository still contains additional/older components (for example `github-service`, gRPC/MCP artifacts, and an older production compose path) that are not the primary active V1 runtime described above.  
For current architecture, treat the API + Worker + Analysis + Frontend path as canonical.
