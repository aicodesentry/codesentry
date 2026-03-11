# CodeSentry Target Architecture (V1)

## 1. Product Boundary
CodeSentry V1 is a **GitHub-native security reviewer** for pull requests.

Primary value:
- likely security issue detection in changed code
- exploitability-aware evidence
- actionable minimal remediation guidance
- low-noise PR workflow

Out of scope in core UX:
- style scoring
- generic maintainability coaching

## 2. System Topology

### Services
1. **frontend** (`frontend/`)
- React + Vite SaaS dashboard.
- Auth + repository/install flow + findings views.

2. **api-service** (`services/api-service/`)
- Primary control plane.
- Responsibilities:
  - dashboard auth/session
  - GitHub App install flow helpers
  - webhook ingestion + signature verification
  - idempotent event handling + queue enqueue
  - canonical APIs for repositories, PR runs, findings, suppressions, settings
  - GitHub check-run and comment orchestration
  - observability (metrics, structured logs, correlation IDs)

3. **analysis-service** (`services/analysis-service/`)
- Python FastAPI analysis engine.
- Responsibilities:
  - changed-file security analysis
  - deterministic rules + pattern/AST-ish heuristics
  - secret and dependency risk checks
  - optional LLM contextualization via provider adapter
  - finding normalization/fingerprinting support

4. **worker-service** (`services/worker-service/`)
- Queue consumer (BullMQ) + orchestration worker.
- Responsibilities:
  - consume PR analysis jobs
  - fetch changed files from GitHub
  - invoke analysis-service
  - normalize/dedupe/store findings
  - apply baseline/suppressions
  - publish GitHub summary + inline comments + check runs

### Data/Infra
- **PostgreSQL** as canonical source of truth.
- **Redis** for queue and short-lived cache.
- **Prometheus-compatible metrics endpoints** on services.

## 3. Core Flow
1. GitHub sends webhook (`pull_request`, `push`, `installation`, etc.).
2. API verifies signature, checks idempotency key, persists lightweight event log.
3. API enqueues `pr.analyze` job.
4. Worker pulls job, fetches changed files and metadata via GitHub App installation token.
5. Worker sends changed files to analysis-service.
6. Analysis-service returns structured candidate findings.
7. Worker normalizes to canonical schema, computes fingerprint, deduplicates/upserts.
8. Worker applies confidence gates:
- high confidence => inline + summary
- medium confidence => summary only
- low confidence => stored only
9. Worker creates/updates check run and one deduplicated summary comment.
10. Dashboard reads stored runs/findings/suppressions.

## 4. Canonical Domain Model

### Key Tables
- `installations`
- `users`
- `repositories`
- `pull_requests`
- `analysis_runs`
- `findings`
- `suppressions`
- `audit_logs`
- `webhook_deliveries` (idempotency + processing state)

### Finding Schema
`findings` includes:
- id
- repository_id
- installation_id
- pull_request_number
- commit_sha
- fingerprint
- rule_id
- title
- description
- category
- cwe_id
- owasp_category
- severity
- confidence
- exploitability
- file_path
- line_start
- line_end
- code_snippet
- evidence
- exploit_scenario
- remediation
- remediation_patch
- status (`open`, `dismissed`, `accepted_risk`, `fixed`)
- dismissal_reason
- created_at
- updated_at
- first_seen_at
- last_seen_at

## 5. Security Categories (V1)
- SQL injection
- command injection
- path traversal
- SSRF
- XSS
- insecure deserialization
- broken access control / auth bypass
- hardcoded secrets
- insecure cryptography usage
- unsafe file upload
- dependency/package risk
- unsafe LLM/prompt injection patterns (only in repos with LLM flows)

## 6. Trust & Noise Reduction Design
- deterministic-first detection pipeline
- confidence scoring and strict comment gating
- fingerprint dedupe across reruns
- suppression + accepted-risk workflow with audit trail
- baseline mode (legacy repos show new findings by default)

## 7. API Surface (V1)
- `GET /health`, `GET /metrics`
- `GET /auth/github`, `GET /auth/github/callback`, `GET /auth/me`
- `GET /api/installations`, `POST /api/installations/sync`
- `GET /api/repositories`, `GET /api/repositories/:id`
- `GET /api/repositories/:id/pull-requests`
- `GET /api/pull-requests/:id/findings`
- `GET /api/findings/:id`, `PATCH /api/findings/:id/status`
- `GET /api/suppressions`, `POST /api/suppressions`, `DELETE /api/suppressions/:id`
- `POST /webhooks/github`
- `POST /internal/analysis-runs/:id/complete` (worker callback, secret-protected)

## 8. Observability
- structured JSON logs with correlation ID
- webhook processing metrics and latency
- queue depth/processing metrics
- analysis latency and finding counts by category/severity/confidence
- GitHub comment/check-run success/failure counters

## 9. Deployment Model
- local/dev: docker compose (postgres, redis, api, worker, analysis, frontend)
- production: separately deployable containers, same env contract

