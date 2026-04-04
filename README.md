# Mitig8it

A platform to plug into GitHub, analyze every pull request, and deliver actionable security reviews with multi-source context (regex, Semgrep, dependency checks plus LLM-ready BYOK hints).

## How It Works

1. Developer opens a PR
2. Mitig8it receives the webhook, analyzes changed files
3. Posts a PR review: `CHANGES_REQUESTED` if critical/high findings, `COMMENT` otherwise
4. Each finding is annotated on the exact line with severity, evidence, and remediation

No CI config. No manual scans. Just install, invite the Mitig8it App, and merge with confidence.

## Highlights

- **Multi-taxonomy findings** – every issue carries internal typing plus CWE, OWASP, ATT&CK, and CAPEC mappings so compliance reports stay consistent.
- **Clusters, not noise** – Tier 1 regex hits, dependency detectors, and Semgrep runs now dedupe/cluster into single reviewer-facing findings with stronger evidence snippets.
- **Federated BYOK roadmap** – we keep user LLM keys encrypted and scoped so you can opt into explanations/remediations without exposing secrets.
- **Guided onboarding** – empty states and first-run checklist explain how to connect GitHub, trigger the first analysis, and view the review summary.

## Detection Engine

Two-tier analysis pipeline:

**Tier 1 — Static Pattern Matching** (< 100ms, 35 rules)
Regex-based detection covering CWE Top 25 and OWASP Top 10.

**Tier 2 — AST Analysis via Semgrep** (2-5s, 25 rules)
Language-aware analysis with taint tracking and data flow for Python and JavaScript.

### Coverage (35 CWEs)

| Category | CWEs |
|----------|------|
| Injection | SQL (89), Command (78), Code (95), NoSQL (943), LDAP (90), Template (1336) |
| XSS | DOM-based, innerHTML, dangerouslySetInnerHTML (79) |
| Broken Access Control | Missing auth (862, 306), Path traversal (22), CORS (942), CSRF (352), Open redirect (601) |
| Cryptographic Failures | Weak hash (327), Weak password hash (916), Weak random (330), Hardcoded IV (329) |
| Secrets | Hardcoded credentials (798) |
| Deserialization | pickle, yaml.load, marshal, ObjectInputStream (502) |
| SSRF | Untrusted URL fetch (918) |
| Security Misconfiguration | Debug mode (489), TLS disabled (295), Verbose errors (209), Unsafe upload (434) |
| Memory Safety | Buffer overflow (120), Format string (134) |
| Other | XXE (611), Integer overflow (190), Race conditions (362, 367), Sensitive logs (532), Rate limiting (770) |

Plus 11 dependency risk patterns for known vulnerable package versions.

## Architecture

```
GitHub PR webhook
    |
    v
API Service (Node.js) ── orchestrates analysis, persists findings
    |
    +── Analysis Service (Python/FastAPI) ── Tier 1 regex + Tier 2 Semgrep
    |
    +── GitHub Service (Node.js) ── posts PR reviews, check runs
    |
    v
PostgreSQL ── findings, analysis runs, repositories, users
```

**Services:**
- **Frontend** — React + Vite dashboard. OAuth login, repo management, analysis reports.
- **API Service** — Webhook ingestion, analysis orchestration, REST APIs.
- **GitHub Service** — GitHub App auth, PR file fetching, review posting.
- **Analysis Service** — Security rule engine (regex + Semgrep).

**Infrastructure:**
- PostgreSQL (sole data store)
- Redis (ephemeral cache)
- Google Cloud Run (services)
- Firebase Hosting (frontend)

## Quick Start

```bash
# 1. Bootstrap local env and local-only secrets
./scripts/setup-local-dev.sh

# 2. Fill in GitHub credentials in .env
#    GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_APP_ID,
#    GITHUB_APP_PRIVATE_KEY

# 3. Install the git hook that blocks direct pushes to main/master
./scripts/install-git-hooks.sh

# 4. Validate
./scripts/validate-env.sh

# 5. Start
docker-compose up --build
```

- Frontend: http://localhost:5173
- API: http://localhost:3000
- Analysis: http://localhost:8001

Single root `.env` feeds all services via `docker-compose env_file:`. No per-service env files needed.

## Local Development

- `./scripts/setup-local-dev.sh` creates a root `.env` from `.env.example` and generates local-only app secrets when placeholders are still present.
- `./scripts/install-git-hooks.sh` configures `.githooks/pre-push`, which blocks direct pushes to `main` and `master`.
- `docker-compose up --build` runs the full stack locally.
- If Docker is not running, the app stack will not start and the API/database-backed counts will be unavailable.

Recommended workflow:

```bash
git checkout -b feat/my-change
./scripts/setup-local-dev.sh
./scripts/install-git-hooks.sh
docker-compose up --build
```

## Testing

```bash
# Security rule tests (94 tests)
cd services/analysis-service/src && python -m pytest tests/ -v

# API tests
cd services/api-service && npm test

# Env validation
./scripts/validate-env.sh
```

## Deployment

Services deploy independently to Google Cloud Run via GitHub Actions on push to `main`. Secrets are managed through GCP Secret Manager. See `docs/DEPLOYMENT.md`.

## Docs

- [Environment Setup](ENV_SETUP.md)
- [Architecture](docs/ARCHITECTURE.md)
- [GitHub App Setup](docs/GITHUB_APP_SETUP.md)
- [Deployment](docs/DEPLOYMENT.md)
