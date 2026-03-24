# CodeSentry

CodeSentry is a GitHub-native AI security reviewer for pull requests.

## What Problem It Solves

Most security vulnerabilities ship because code review can't catch everything — reviewers focus on logic and style, not exploitation patterns. Static analysis tools drown teams in false positives, so real issues get ignored. CodeSentry sits in the PR workflow and flags only likely-exploitable security issues in changed code, with evidence and remediation guidance, so teams can fix vulnerabilities before they merge.

## Real Impact

- **Catches security issues at the PR stage** — SQL injection, command injection, path traversal, SSRF, XSS, hardcoded secrets, broken auth, insecure crypto, and more, before they reach production.
- **Reduces false positive noise** — confidence gating ensures only high-confidence findings appear as inline PR comments; medium-confidence issues go to the summary; low-confidence findings are stored but don't interrupt developers.
- **Zero workflow friction** — installs as a GitHub App, runs automatically on every PR, posts results as check runs and comments. No CI config or separate tool to manage.
- **Suppression and baseline support** — teams can suppress known/accepted risks and set baselines so only new issues are surfaced.

## System Design

### Services
- **Frontend** (`frontend/`) — React + Vite SaaS dashboard. OAuth login, repository management, findings browser, and analysis reports.
- **API Service** (`services/api-service/`) — Node.js/Express control plane. Handles GitHub OAuth, webhook ingestion with signature verification, JWT session auth, and exposes REST APIs for repositories, PRs, findings, suppressions, and reports.
- **GitHub Service** (`services/github-service/`) — GitHub App adapter. Fetches PR changed files via installation tokens, posts check runs and inline/summary PR comments.
- **Analysis Service** (`services/analysis-service/`) — Python FastAPI engine. Runs deterministic rules + AST-based heuristics + secret/dependency checks. Optional LLM contextualization. Returns structured, fingerprinted findings.

### APIs
- `GET /auth/github`, `GET /auth/github/callback`, `GET /auth/me` — OAuth flow and session
- `GET/POST /api/installations` — GitHub App installation management
- `GET /api/repositories`, `GET /api/repositories/:id/pull-requests` — repo and PR listing
- `GET /api/findings`, `PATCH /api/findings/:id/status` — finding retrieval and triage
- `GET/POST/DELETE /api/suppressions` — suppression rules
- `GET /api/reports/summary`, `GET /api/reports/pr-analyses` — dashboard analytics
- `POST /analyze/pr` — analysis pipeline trigger (internal)

### Database (PostgreSQL)
Core tables: `installations` → `users` → `repositories` → `pull_requests` → `analysis_runs` → `findings` → `suppressions`, plus `webhook_deliveries` and `audit_logs`. Foreign keys enforce referential integrity across the GitHub App → repo → PR → analysis → finding chain.

### Infrastructure
- **PostgreSQL** — canonical source of truth for all domain data
- **Redis** — job queue (BullMQ) and short-lived cache
- **Cloud Run** — each service deployed independently on Google Cloud Run
- **Firebase Hosting** — frontend SPA hosting

See docs:
- `TARGET_ARCHITECTURE.md`
- `docs/ARCHITECTURE.md`
- `docs/GITHUB_APP_SETUP.md`
- `docs/LOCAL_DEV.md`
- `docs/DEPLOYMENT.md`
- `docs/KNOWN_LIMITATIONS.md`

## Quick Start
1. Copy env file:
   - `cp .env.example .env`
2. Fill GitHub and secret variables in `.env`.
3. Start stack:
   - `docker-compose up --build`
4. Open:
   - Frontend: `http://localhost:5173`
   - API: `http://localhost:3000`
   - Analysis: `http://localhost:8001`

## Core Security Categories (V1)
- SQL injection
- command injection
- path traversal
- SSRF
- XSS
- insecure deserialization
- broken access control/auth bypass
- hardcoded secrets
- insecure cryptography usage
- unsafe file upload
- dependency/package risk
- unsafe LLM/prompt injection patterns (only when LLM flows are present)

## Testing
- API tests:
  - `cd services/api-service && npm test`
- Analysis pipeline test:
  - `cd services/analysis-service/src && python -m unittest test_pipeline.py`
- End-to-end happy path:
  - `./scripts/e2e-happy-path.sh`
