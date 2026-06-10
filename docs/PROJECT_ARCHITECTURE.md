# Mitig8it Project Architecture

## Overview
Mitig8it is a GitHub-native AI security reviewer for pull requests.  
The active V1 runtime path is:

- `frontend` (React/Vite dashboard)
- `api-service` (Node/Express control plane + webhook ingest)
- `github-service` (Node/Express GitHub adapter for PR file fetch/comments/check-runs)
- `analysis-service` (FastAPI deterministic analysis engine)
- `postgres` (system of record)

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
- Creates `analysis_runs` and triggers background analysis orchestration.
- Exposes authenticated dashboard APIs for repositories/PRs/findings/suppressions.
- Runs analysis orchestration in-process (async trigger) and updates findings/runs.

### GitHub Service (`services/github-service/`)
- Owns GitHub App installation-token usage and API calls.
- Exposes internal authenticated endpoints for:
  - PR changed-file fetch
  - Summary comment upsert
  - Inline PR comments
  - Check-run creation

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

## End-to-End Flow
1. GitHub sends a `pull_request` webhook to API.
2. API verifies webhook signature and deduplicates by delivery ID.
3. API upserts repository/PR data, inserts `analysis_runs` row, and triggers async analysis.
4. API orchestration requests changed files from github-service.
5. API calls analysis-service with PR metadata + file patches.
6. Analysis-service returns normalized findings.
7. API upserts findings, applies suppressions/baseline, and marks fixed findings.
8. API calls github-service to post summary + inline comments (high confidence) + check-run.
9. API finalizes `analysis_runs` status/counts and writes audit logs.
10. Frontend reads stored runs/findings/repositories via API.

## Security Controls
- Webhook HMAC validation (`GITHUB_WEBHOOK_SECRET`).
- Internal API->GitHub service auth (`GITHUB_SERVICE_INTERNAL_SECRET`).
- JWT-backed `HttpOnly` cookie auth for dashboard APIs.
- Confidence-gated GitHub comment strategy to reduce noise.

## Observability
- `/health` endpoints across services.
- `/metrics` endpoints for Prometheus-style scraping behind `x-internal-secret`.
- Correlation IDs in API request flow.
- Structured logging in API/github/analysis paths.

## Deployment Model
- Local development: Docker Compose (`postgres`, `api-service`, `github-service`, `analysis-service`, `frontend`).
- Production model: independently deployed containers/services with the same env contract, managed Postgres/Redis, and separately hosted frontend.

## Repo Note: Legacy/Parallel Components
The repository still contains an older production compose path that is not part of the current primary runtime.
