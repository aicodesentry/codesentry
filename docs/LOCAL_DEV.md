# Local Development

## Prerequisites
- Docker + Docker Compose
- GitHub App credentials

## Boot
1. `cp .env.example .env`
2. Populate required env values.
3. `docker-compose up --build`

## Service URLs
- Frontend: `http://localhost:5173`
- API: `http://localhost:3000`
- Analysis: `http://localhost:8001`
- Prometheus: `http://localhost:9090`

## Observability
- Prometheus runs in the local Docker stack and scrapes:
  - `api-service:3000/metrics`
  - `github-service:3002/metrics`
  - `analysis-service:8001/metrics`
- Config lives in [infrastructure/prometheus/prometheus.yml](/Users/nehachaudhari/Developer/codesentry/infrastructure/prometheus/prometheus.yml:1).

## Common Commands
- Full reset (remove DB volume):
  - `docker-compose down -v && docker-compose up --build`
- API tests:
  - `cd services/api-service && npm test`
- Analysis tests:
  - `cd services/analysis-service/src && python -m unittest test_pipeline.py`
- E2E smoke:
  - `./scripts/e2e-happy-path.sh`
