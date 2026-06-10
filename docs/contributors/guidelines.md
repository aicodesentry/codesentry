# Repository Guidelines

Use this as the short contributor guide. Detailed setup and operations live in the linked docs instead of being repeated here.

## Repository Layout

- `frontend/` - React/Vite dashboard.
- `services/api-service/` - Express control plane, auth, webhooks, REST APIs, migrations.
- `services/github-service/` - Express GitHub App adapter for PR files, comments, and check runs.
- `services/analysis-service/` - FastAPI analysis engine.
- `proto/` - Shared protobuf definitions and generated artifacts.
- `scripts/` - Operational helpers and smoke scripts.
- `infrastructure/` - Local Postgres, Prometheus, and Grafana Agent config.
- `.github/workflows/` - CI and deploy workflows.

## Primary Docs

- Local setup: [local-dev.md](/Users/nehachaudhari/Developer/codesentry/docs/getting-started/local-dev.md:1)
- Environment contract: [environment.md](/Users/nehachaudhari/Developer/codesentry/docs/getting-started/environment.md:1)
- Architecture: [overview.md](/Users/nehachaudhari/Developer/codesentry/docs/architecture/overview.md:1)
- Deployment: [cloud-run-firebase.md](/Users/nehachaudhari/Developer/codesentry/docs/deployment/cloud-run-firebase.md:1)

## Development Rules

- Keep service boundaries intact; prefer local helpers and established patterns over new abstractions.
- Keep secrets out of git. Use the root `.env` locally and managed secret stores in deployed environments.
- JavaScript/TypeScript uses 2-space indentation, camelCase for variables/functions, PascalCase for React components, and UPPER_SNAKE_CASE for env keys.
- Python follows PEP 8, snake_case naming, and type hints where practical.
- Add focused tests for changed behavior, especially request validation, orchestration, webhook handling, and analysis rules.

## Pull Requests

- Use concise prefixes seen in history: `Feat:`, `Fix:`, `Chore:`, `Docs:`.
- Include affected service, environment/config changes, linked issue or ticket, and test evidence.
- Include screenshots for UI changes and sample webhook/analysis payloads when behavior changes.
