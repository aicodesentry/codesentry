# CodeSentry V1 Architecture

## Control Plane
`services/api-service` provides:
- auth/session for dashboard users
- GitHub App installation sync APIs
- webhook verification and idempotent ingest
- queue enqueue for PR analysis
- repositories / PRs / findings / suppressions APIs

## Worker Plane
`services/worker-service` provides:
- BullMQ consumer over Redis
- changed-file collection from GitHub PR files API
- calls to analysis-service
- normalization and fingerprinting
- dedupe/upsert into PostgreSQL
- suppression and baseline application
- check-run and PR comment publication

## Analysis Plane
`services/analysis-service` provides:
- deterministic security rule scan on changed patches
- dependency risk pattern checks
- finding normalization fields for downstream storage
- Prometheus metrics for analysis load/latency

## Data Model
PostgreSQL tables:
- `installations`
- `users`
- `repositories`
- `pull_requests`
- `analysis_runs`
- `findings`
- `suppressions`
- `audit_logs`
- `webhook_deliveries`

## Trust and Noise Controls
- signature-verified webhook events
- delivery idempotency (`webhook_deliveries.delivery_id`)
- finding dedupe via fingerprint
- inline comments only for high confidence findings
- medium confidence in summary only
- low confidence retained in DB
- suppressions with audit trail
- baseline mode for existing repositories
