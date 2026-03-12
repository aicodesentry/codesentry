# CodeSentry Free-Tier Deployment Plan (All GCP)

This plan optimizes for low cost while keeping production-like behavior.

Guardrails baseline for this plan is defined in `docs/GUARDRAILS.md`.

## Platform Choices
- Frontend: Firebase Hosting (Google Analytics enabled)
- API: Cloud Run (public)
- GitHub Service: Cloud Run (public/internal auth)
- Analysis: Cloud Run (private/internal)
- Worker: Cloud Run (private)
- Postgres: Cloud SQL (smallest tier using credits)
- Redis: Memorystore (smallest tier)

## Mode Selection
### Recommended (current)
- Worker runs as Cloud Run service.
- API, worker, and analysis deploy through GitHub Actions workflows.
- Frontend deploys through GitHub Actions to Firebase Hosting.

### Optional cost optimization
- Worker can be converted to a Cloud Run Job + Scheduler later if latency tradeoffs are acceptable.

## Step-by-Step
1. Create Artifact Registry repository.
2. Create Secret Manager secrets for runtime credentials.
3. Configure GitHub repository Actions secrets/variables.
4. Trigger deploy workflows:
   - `Deploy API (Cloud Run)`
   - `Deploy GitHub Service (Cloud Run)`
   - `Deploy Worker (Cloud Run)`
   - `Deploy Analysis (Cloud Run)`
5. Set GitHub App webhook URL:
   - `<API_URL>/webhooks/github`
6. Trigger frontend workflow:
   - `Deploy Frontend (Firebase Hosting)`
7. Run smoke tests against deployed URLs.

## Firebase Hosting Setup
1. Build frontend from `frontend/`.
2. Configure Firebase Hosting with SPA rewrites to `index.html`.
3. Set GitHub vars:
   - `FIREBASE_PROJECT_ID=<project-id>`
   - `VITE_API_URL=<api-url>`
4. Run frontend deploy workflow.

## Add In-Product Analytics Page
- Route: `/app/analytics`
- Show links to:
  - Firebase/Google Analytics page
  - Google Cloud Monitoring dashboard
- Show current deployment mode and runbook links.

## Google Cloud Monitoring Plan
Use Cloud Monitoring dashboards + uptime checks for service health.

Create:
1. Uptime checks
- API: `/health`
- Analysis: `/health`

2. Alerting policies
- Cloud Run 5xx rate > 2%
- p95 latency > 2s
- Error logs spike (rate based)
- Uptime check failures

3. Dashboards
- Request count by service
- Latency p50/p95/p99
- Error count by service
- Container restart / instance counts

## Budget and Safety
- Set budget alerts at $5, $10, $20.
- Cap Cloud Run max instances.
- Keep logs retention low initially.
- Pilot on a small set of repos before wider rollout.

## Promotion Path
1. Staging pilot (1-2 repos)
2. Validate finding quality and webhook reliability
3. Promote same image tags to production
4. Gradually expand GitHub App installation scope
