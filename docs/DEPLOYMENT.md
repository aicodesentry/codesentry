# Deployment Guide

## Containers
Deploy as separate services:
1. `api-service`
2. `worker-service`
3. `analysis-service`
4. managed `postgres`
5. managed `redis`
6. static frontend hosting (or container)

## Environment
Set strong production values for:
- `JWT_SECRET`
- `WORKER_CALLBACK_SECRET`
- `GITHUB_WEBHOOK_SECRET`
- `GITHUB_APP_PRIVATE_KEY`

Set service endpoints:
- `DATABASE_URL`
- `REDIS_URL`
- `ANALYSIS_SERVICE_URL` (worker)
- `API_CALLBACK_URL` (worker -> api)
- `FRONTEND_URL` (api CORS and redirects)

## Operational Notes
- Enable HTTPS everywhere.
- Restrict `/internal/*` paths to worker-only network access.
- Scrape `/metrics` endpoints with Prometheus/Grafana.
- Route logs to centralized storage with correlation-id.
