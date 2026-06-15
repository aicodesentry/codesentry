# GitHub Service

Express/gRPC service that isolates GitHub App operations from the API service.

## Responsibilities

- Validate direct GitHub webhook test traffic.
- Create GitHub App installation tokens.
- Fetch pull request changed files.
- Post or update Mitig8it PR summary comments.
- Post inline review comments and suggestion blocks.
- Create/update GitHub check runs.
- Expose GitHub App health diagnostics.
- Emit Prometheus metrics.

The API service calls this service through `/internal/*` endpoints protected by `GITHUB_SERVICE_INTERNAL_SECRET` in local REST mode. In Cloud Run production, the API calls the GitHub gRPC service with Cloud Run IAM invoker access.

## Local Development

From the repository root, Docker Compose starts the service on the internal Docker network as `github-service:3002`.

For standalone work:

```bash
cd services/github-service
npm install
npm run dev
```

The service loads its local env and then falls back to the repository root `.env`.

## Scripts

```bash
npm run dev    # nodemon src/index.js
npm start      # node src/index.js
npm run lint   # ESLint
npm test       # Jest
```

## Required Environment

| Variable | Description |
|---|---|
| `WEBHOOK_SECRET` | Secret for direct webhook verification. In local Compose this is mapped from `GITHUB_WEBHOOK_SECRET`. |
| `GITHUB_WEBHOOK_SECRET` | Root env name for webhook secret; used as fallback for `WEBHOOK_SECRET`. |
| `GITHUB_SERVICE_INTERNAL_SECRET` | Shared secret for `/internal/*` routes and production metrics. |
| `GITHUB_APP_ID` | GitHub App ID. |
| `GITHUB_APP_PRIVATE_KEY` | GitHub App private key. |
| `DATABASE_URL` | PostgreSQL connection string. |
| `SERVICE_MODE` | Set to `grpc` in Cloud Run production to run the gRPC server as the service entrypoint. |

Optional email variables:

- `EMAIL_USER`
- `EMAIL_PASSWORD`
- `EMAIL_SERVICE`
- `EMAIL_FROM_NAME`

## Endpoints

- `GET /health`
- `GET /health/github-app`
- `GET /metrics`
- `POST /webhooks/github`
- `/internal/*`

In production, `/metrics` requires `x-internal-secret` matching `METRICS_AUTH_TOKEN` or `GITHUB_SERVICE_INTERNAL_SECRET`.

Cloud Run production uses gRPC health probes on port `8080`; REST endpoints are primarily for local development and compatibility.

## Tests

Current tests cover comment formatting and internal route behavior:

```bash
npm test
```
