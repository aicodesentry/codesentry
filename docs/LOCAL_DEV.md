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

## Common Commands
- Full reset (remove DB volume):
  - `docker-compose down -v && docker-compose up --build`
- API tests:
  - `cd services/api-service && npm test`
- Worker tests:
  - `cd services/worker-service && npm test`
- Analysis tests:
  - `cd services/analysis-service/src && python -m unittest test_pipeline.py`
- E2E smoke:
  - `./scripts/e2e-happy-path.sh`
