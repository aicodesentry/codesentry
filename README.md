# CodeSentry

CodeSentry is a GitHub-native AI security reviewer for pull requests.

It focuses on **trustworthy security findings** in changed code, with:
- exploitability-aware evidence
- confidence gating to reduce noise
- GitHub check-run + PR comments workflow
- suppression and baseline support

## Architecture
- `frontend/`: React + Vite dashboard
- `services/api-service/`: control plane API, webhook ingestion, auth, queue producer
- `services/worker-service/`: queue consumer, GitHub orchestration, finding persistence
- `services/analysis-service/`: Python security analysis pipeline
- `infrastructure/docker/postgres/init.sql`: canonical PostgreSQL schema

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
- Worker unit tests:
  - `cd services/worker-service && npm test`
- Analysis pipeline test:
  - `cd services/analysis-service/src && python -m unittest test_pipeline.py`
- End-to-end happy path:
  - `./scripts/e2e-happy-path.sh`
