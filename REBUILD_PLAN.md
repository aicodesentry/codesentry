# CodeSentry Rebuild Plan (Security-Only V1)

## Goals
- Replace generic AI code review positioning with a security-first PR workflow.
- Ship a production-oriented, low-noise GitHub-native reviewer with evidence-rich findings.
- Simplify architecture around one control plane, one analysis pipeline, and durable relational state.

## Keep / Refactor / Remove

### Keep
- `frontend/` React + Vite foundation (faster path than full Next.js migration for V1).
- PostgreSQL + Redis infrastructure.
- Existing Docker Compose workflow.
- Existing authentication/session primitives (JWT/cookie) as operator dashboard auth.

### Refactor
- API service into the primary control plane for:
  - GitHub App installation lifecycle
  - webhook ingestion + idempotency
  - repository/PR/finding/suppression APIs
  - queue orchestration and observability
- Analysis service into security-only pipeline (remove style scoring and generic messaging).
- Frontend into focused security product UX:
  - repositories, PR runs, findings, finding details, suppressions, settings/onboarding.
- Database schema into canonical security model and audit-friendly suppression lifecycle.

### Remove / De-prioritize
- Style analysis in user-facing product paths.
- Generic “code quality” findings and dashboard metrics.
- Legacy webhook/reports endpoints tied to deprecated tables (`analysis`, `webhook_events`).
- MongoDB dependency in core V1 path.

## Execution Phases

## Phase 1: Audit + Architecture (done first)
- Inspect current repo and identify broken/misaligned areas.
- Write:
  - `REBUILD_PLAN.md`
  - `TARGET_ARCHITECTURE.md`

## Phase 2: Backend + Domain + GitHub Integration
- Stabilize DB schema for canonical findings and workflow tables.
- Implement API modules:
  - installations, repositories, pull requests, findings, suppressions, health, metrics.
  - webhook verification + idempotent processing.
  - internal callback route for worker completion.
- Implement Redis/BullMQ queue producer + background worker process.
- Implement GitHub App auth utilities and GitHub API client with retries/backoff.
- Implement check-run and comment publishing with dedupe rules.

## Phase 3: Analysis Pipeline + Trust Controls
- Implement changed-file-focused analysis pipeline:
  - language detection
  - deterministic pre-scan rules
  - secret scan and dependency risk heuristics
  - optional LLM contextualization layer (provider abstraction)
  - canonical normalization and fingerprinting
  - confidence/severity/exploitability mapping
- Implement baseline + suppression + accepted-risk lifecycle.
- Gate PR comments by confidence (high inline, medium summary only).

## Phase 4: Frontend + Integration + Docs + Tests
- Rebuild dashboard IA and pages around security findings workflow.
- Connect to real backend APIs with robust loading/error states.
- Add tests:
  - finding normalization/fingerprinting unit tests
  - API webhook + repository flow tests
  - analysis pipeline integration test
  - e2e happy path script/test
- Update docs:
  - README
  - architecture
  - GitHub App setup
  - local dev
  - deployment
  - known limitations
- Remove dead paths and ensure `docker-compose up --build` works.

## Delivery Constraints and Decisions
- Canonical datastore: PostgreSQL.
- Queue/cache: Redis.
- Control plane: Node.js API service.
- Analysis: Python service.
- Keep React frontend for V1 shipping velocity.
