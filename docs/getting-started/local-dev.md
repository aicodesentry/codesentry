# Local Development

This repository is optimized for Docker Compose local development with a single root `.env` file.

## Prerequisites

- Docker Desktop or another Docker engine with Compose support.
- Node.js 20 for standalone frontend/API/GitHub service work.
- Python 3.11 for standalone analysis-service work.
- GitHub OAuth App and GitHub App credentials for end-to-end auth/webhook flows.

## Bootstrap

```bash
./scripts/setup-local-dev.sh
./scripts/install-git-hooks.sh
./scripts/validate-env.sh
docker-compose up --build
```

`setup-local-dev.sh` creates `.env` from `.env.example` if needed and fills local-only secrets. You must still add real GitHub credentials before the full OAuth/App flow works.

## Local URLs

| Component | URL |
|---|---|
| Frontend | `http://localhost:5173` |
| API service | `http://localhost:3000` |
| API health | `http://localhost:3000/health` |
| Prometheus | `http://localhost:9090` |

In Compose, `github-service` and `analysis-service` are exposed only to the Docker network:

- `http://github-service:3002`
- `http://analysis-service:8001`

Run those services standalone or add temporary port mappings if you need direct browser/curl access from the host.

## Compose Stack

`docker-compose.yml` starts:

- `postgres` from `postgres:15-alpine`, initialized by `infrastructure/docker/postgres/init.sql`.
- `api-service` on host port `3000`.
- `github-service` on Docker port `3002`.
- `analysis-service` on Docker port `8001`.
- `frontend` on host port `5173`.
- `prometheus` on host port `9090`.

The API waits for Postgres health and starts after the GitHub and analysis containers are started. The API service bootstraps schema locally via `ensureDatabaseSchema()`.

## Common Commands

```bash
# Start or rebuild the full stack
docker-compose up --build

# Stop containers
docker-compose down

# Stop containers and remove DB/Prometheus volumes
docker-compose down -v

# Validate required root env vars
./scripts/validate-env.sh

# Check app/service health helpers
./scripts/health-check.sh
./scripts/monitor-services.sh

# Run local happy-path smoke script
./scripts/e2e-happy-path.sh
```

## Standalone Services

Use standalone mode when you are iterating on one service and want faster restarts.

```bash
# Frontend
cd frontend
npm install
npm run dev

# API
cd services/api-service
npm install
npm run dev

# GitHub service
cd services/github-service
npm install
npm run dev

# Analysis service
cd services/analysis-service
pip install -r src/requirements.txt
uvicorn src.main:app --reload --port 8001
```

The API and GitHub service load the root `.env` automatically. For analysis-service standalone runs:

```bash
set -a
source .env
set +a
cd services/analysis-service
uvicorn src.main:app --reload --port 8001
```

## Tests

```bash
# Frontend
cd frontend
npm run lint
npm test
npm run build

# API service
cd services/api-service
npm run lint
npm test

# GitHub service
cd services/github-service
npm run lint
npm test

# Analysis service
cd services/analysis-service/src
pip install -r requirements-test.txt
pytest tests -q
```

## Observability

Prometheus config lives in [infrastructure/prometheus/prometheus.yml](../../infrastructure/prometheus/prometheus.yml).

Local Prometheus scrapes:

- `api-service:3000/metrics`
- `github-service:3002/metrics`
- `analysis-service:8001/metrics`

In production, metrics endpoints require `x-internal-secret`. Locally, the API and GitHub service only enforce metrics auth when `NODE_ENV=production`; the analysis service always requires internal auth for `/metrics`.

## Webhook Testing

For real GitHub webhook testing:

1. Start the API locally.
2. Create a public tunnel to `http://localhost:3000`.
3. Set the GitHub App webhook URL to `<public-url>/webhooks/github`.
4. Set the same secret in GitHub and `GITHUB_WEBHOOK_SECRET`.
5. Trigger installation or pull request events.

The local validation helper can create a temporary branch/PR and poll for Mitig8it feedback:

```bash
TARGET_REPO=owner/repo ./scripts/live-suggestion-validation.sh
```
