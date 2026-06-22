# Analysis Service

FastAPI service that analyzes changed pull request files.

## Responsibilities

- Accept changed-file PR payloads from the API service.
- Filter non-runtime paths such as tests and rule fixtures.
- Run Tier 1 regex and dependency-risk checks.
- Run Tier 2 OpenGrep rules.
- Run optional Tier 3 LLM triage when configured.
- Build remediation patch metadata when possible.
- Normalize, cluster, and return finding objects.
- Expose health and Prometheus metrics.

## Local Development

```bash
cd services/analysis-service
pip install -r src/requirements.txt
uvicorn src.main:app --reload --port 8001
```

For standalone runs, export the root `.env` first:

```bash
set -a
source .env
set +a
```

## Tests

```bash
cd services/analysis-service/src
pip install -r requirements-test.txt
pytest tests -q
```

## Main Endpoints

- `GET /`
- `GET /health`
- `GET /metrics`
- `POST /analyze/pr`
- `POST /analyze/pr/tier1`
- `POST /analyze/pr/tier2`
- `POST /analyze/pr/tier3`

Analysis requests and metrics require `x-internal-secret`. The expected value is `ANALYSIS_SERVICE_INTERNAL_SECRET` when set, otherwise `GITHUB_SERVICE_INTERNAL_SECRET`.

## Key Environment

- `GITHUB_SERVICE_INTERNAL_SECRET`
- `ANALYSIS_SERVICE_INTERNAL_SECRET`
- `LLM_PROVIDER`
- `LLM_MODEL` / `LLM_TRIAGE_MODEL`
- `LLM_API_KEY`
- `GEMINI_API_KEY` / `OPENAI_API_KEY` provider-specific local fallbacks
- `FRONTEND_URL`
- `ANALYSIS_CACHE_TTL_DAYS`

For the full env contract, see [environment.md](../getting-started/environment.md).
