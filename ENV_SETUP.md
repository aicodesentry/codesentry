# Environment Variables Setup Guide

Mitig8it uses a **single root `.env` file** as the source of truth for all services.

## Quick Start

```bash
# 1. Copy the root template
cp .env.example .env

# 2. Fill in your GitHub credentials
#    GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY

# 3. Generate secrets
openssl rand -hex 32   # → JWT_SECRET
openssl rand -hex 32   # → ENCRYPTION_KEY
openssl rand -hex 20   # → GITHUB_WEBHOOK_SECRET
openssl rand -hex 20   # → GITHUB_SERVICE_INTERNAL_SECRET

# 4. Validate
./scripts/validate-env.sh

# 5. Start everything
docker-compose up
```

No per-service `.env` files are needed for docker-compose development.

## How It Works

- **docker-compose** reads the root `.env` via `env_file:` and passes all vars to every service.
- **Service-specific overrides** (ports, docker hostnames) are set in `docker-compose.yml` `environment:` blocks, which take precedence over `env_file`.
- **Standalone runs** (e.g. `cd services/api-service && npm start`): Node services automatically fall back to the root `.env` via dotenv.
- **Python analysis-service** standalone: source the root `.env` manually: `export $(grep -v '^#' ../../.env | xargs)`

## Variable Reference

### Shared (all services via root `.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `GITHUB_APP_ID` | Yes | GitHub App ID |
| `GITHUB_APP_PRIVATE_KEY` | Yes | GitHub App private key (PEM, newlines escaped as `\n`) |
| `GITHUB_WEBHOOK_SECRET` | Yes | Webhook HMAC secret (aliased to `WEBHOOK_SECRET` for github-service) |
| `GITHUB_SERVICE_INTERNAL_SECRET` | Yes | Service-to-service auth secret |
| `FRONTEND_URL` | No | Frontend origin for CORS (default: `http://localhost:5173`) |

### API Service

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | Yes | JWT signing secret |
| `GITHUB_CLIENT_ID` | Yes | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | Yes | GitHub OAuth client secret |
| `GITHUB_CALLBACK_URL` | No | OAuth callback URL (default: `http://localhost:3000/auth/github/callback`) |
| `ENCRYPTION_KEY` | Yes | 64-hex-character key used to encrypt stored GitHub OAuth tokens |
| `GITHUB_APP_SLUG` | No | GitHub App slug (default: `aicodesentry`) |

### Analysis Service (all optional)

| Variable | Description |
|---|---|
| `REDIS_URL` | Redis cache endpoint (default: `redis://localhost:6379`) |
| `GEMINI_API_KEY` | Google Gemini API key for AI analysis |
| `MONGODB_URL` | MongoDB connection string (disabled if unset) |
| `ANALYSIS_STORE_IN_MONGO` | Enable MongoDB storage (default: `true`) |

### Operational / Internal Auth

| Variable | Required | Description |
|---|---|---|
| `METRICS_AUTH_TOKEN` | No | Optional dedicated header token for `/metrics`; falls back to `GITHUB_SERVICE_INTERNAL_SECRET` |

### GitHub Service (optional)

| Variable | Description |
|---|---|
| `EMAIL_USER` | SMTP user for email notifications |
| `EMAIL_PASSWORD` | SMTP password |
| `EMAIL_SERVICE` | SMTP provider (default: `gmail`) |

### Frontend (build-time)

| Variable | Description |
|---|---|
| `VITE_API_URL` | API endpoint (default: `http://localhost:3000`) |

## Webhook Secret Alias

The root `.env` uses `GITHUB_WEBHOOK_SECRET`. The github-service expects `WEBHOOK_SECRET`. This mapping is handled automatically:
- **docker-compose**: `WEBHOOK_SECRET: ${GITHUB_WEBHOOK_SECRET}` in the environment block
- **standalone**: `process.env.WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || process.env.GITHUB_WEBHOOK_SECRET` in index.js

## Production

Production deploys via GitHub Actions + GCP Cloud Run are unaffected by this setup. They inject env vars through `gcloud run deploy --update-env-vars` and GCP Secret Manager via `--set-secrets`. See `docs/DEPLOYMENT.md` for details.

## Troubleshooting

| Problem | Fix |
|---|---|
| "Missing required env vars" on startup | Run `./scripts/validate-env.sh` to find what's missing |
| GitHub OAuth not working | Verify `GITHUB_CLIENT_ID`/`SECRET` match your GitHub OAuth App |
| Startup fails on missing `ENCRYPTION_KEY` | Generate one with `openssl rand -hex 32` and set it in the root `.env` |
| Webhooks not received | Ensure `WEBHOOK_URL` is publicly accessible (use ngrok for local dev) |
| PR comments or analysis fail with 401/403 | Check `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, and `GITHUB_SERVICE_INTERNAL_SECRET` are set consistently across services |
| Metrics return 403 | Send `x-internal-secret: $METRICS_AUTH_TOKEN` or `x-internal-secret: $GITHUB_SERVICE_INTERNAL_SECRET` |
| Database connection refused | Verify `DATABASE_URL` uses `postgres` hostname (docker) or `localhost` (standalone) |
