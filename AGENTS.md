# Repository Guidelines

## Project Structure & Module Organization
- `frontend/` React + Vite UI with Tailwind and ESLint; assets live under `public/`, routes and components under `src/`.
- `services/api-service/` Node.js/Express REST API (port 3000) with Jest tests and PostgreSQL integrations.
- `services/github-service/` Node.js/Express webhook + notification service (port 3002); optional email delivery.
- `services/analysis-service/` FastAPI + gRPC worker (port 8001) that runs code analysis; Python deps in `src/requirements.txt`; credentials expected in `services/analysis-service/credentials/`.
- `proto/` holds shared protobuf definitions; `scripts/` and `infrastructure/` provide operational tooling; Docker orchestration via `docker-compose.yml`.

## Build, Test, and Development Commands
- Full stack with containers: `docker-compose up --build` (start) and `docker-compose down` (stop/clean). Wait for health before UI work.
- API service: `cd services/api-service && npm install && npm run dev`; run `npm test` for Jest + Supertest suite.
- GitHub service: `cd services/github-service && npm install && npm run dev` (no automated tests yet).
- Analysis service: `cd services/analysis-service && pip install -r src/requirements.txt && uvicorn src.main:app --reload --port 8001`; for gRPC only, run `python src/grpc_server/analysis_server.py`.
- Frontend: `cd frontend && npm install && npm run dev`; production build with `npm run build`; lint with `npm run lint`.

## Coding Style & Naming Conventions
- JavaScript/TypeScript: 2-space indentation; prefer camelCase for variables/functions, PascalCase for React components, UPPER_SNAKE_CASE for constants and env keys. API/GitHub services use CommonJS; frontend uses ESM.
- Python: follow PEP 8 and type hints where possible; snake_case for functions/variables. Keep gRPC/proto artifacts in `grpc_generated/` folders.
- Configuration: duplicate `.env.example` files per service into `.env`; do not commit secrets or `credentials/` contents.

## Testing Guidelines
- API: place tests in `services/api-service/src/__tests__/`; run `npm test`. Mock external calls (GitHub, DB) to keep tests deterministic.
- Frontend: rely on `npm run lint`; add React tests near components when introducing new UI behavior.
- Analysis: add lightweight unit tests for helpers or gRPC clients as Python `unittest` modules adjacent to the code; prefer fast offline fixtures.
- Aim for coverage on request/response validators, error paths, and webhook handlers; document any gaps in PRs.

## Commit & Pull Request Guidelines
- Follow existing history style: `Feat:`, `Fix:`, `Chore:`, `Docs:` prefixes with concise scope (e.g., `Feat: cache dashboard PR list`).
- PRs should state the affected service, linked issue/ticket, environment or config changes, and test evidence (`npm test`, `npm run lint`, manual scenarios). Include screenshots for UI changes and sample webhook/analysis payloads when relevant.

## Security & Configuration Tips
- Keep secrets out of git: use `.env` per service and place GCP keys at `services/analysis-service/credentials/gcp-service-account.json`.
- Update `WEBHOOK_URL` when ngrok changes and restart GitHub service; rotate `JWT_SECRET`/`WEBHOOK_SECRET` via `.env` not code.
- Validate ports to avoid clashes (API 3000, Frontend 3001, GitHub 3002, Analysis 8001); adjust docker-compose/local envs consistently if changed.
