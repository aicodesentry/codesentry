# API Service

Express control plane for Mitig8it.

## Responsibilities

- GitHub OAuth login, callback handling, session cookies, and logout.
- GitHub webhook ingest at `POST /webhooks/github`.
- Webhook signature verification and delivery idempotency.
- Repository, pull request, analysis run, finding, suppression, and report APIs.
- PR analysis orchestration across the GitHub service and analysis service.
- PostgreSQL schema bootstrap for local development and migration scripts for production.
- Prometheus metrics and health checks.

## Local Development

```bash
cd services/api-service
npm install
npm run dev
```

The service listens on `PORT` or `3000`. It loads the repository root `.env` as a fallback.

## Scripts

```bash
npm run dev
npm start
npm run lint
npm test
npm run db:migrate
npm run db:verify
```

## Main Endpoints

- `GET /`
- `GET /health`
- `GET /metrics`
- `/auth/*`
- `POST /webhooks/github`
- `/api/installations/*`
- `/api/repositories/*`
- `/api/reports/*`
- `/api/findings/*`
- `/api/suppressions/*`
- `/api/webhooks/events`

## Key Environment

- `DATABASE_URL`
- `JWT_SECRET`
- `ENCRYPTION_KEY`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GITHUB_CALLBACK_URL`
- `GITHUB_APP_ID`
- `GITHUB_APP_PRIVATE_KEY`
- `GITHUB_WEBHOOK_SECRET`
- `GITHUB_SERVICE_INTERNAL_SECRET`
- `GITHUB_SERVICE_URL`
- `ANALYSIS_SERVICE_URL`
- `FRONTEND_URL`

For the full env contract, see [environment.md](../getting-started/environment.md).
