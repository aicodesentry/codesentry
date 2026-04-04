# Mitig8it Capstone Presentation (Clark MSCS)

## Who We Are
- **Team:** Mitig8it — AI-powered code review assistant
- **Problem:** PR reviews miss security and quality issues; manual reviews slow teams down
- **Goal:** Automate high-signal PR feedback with minimal setup and clear, actionable findings

## What We Built
- **GitHub-native AI reviewer:** Posts summaries and severity-tagged findings directly on PRs
- **Security + Quality:** Detects vulnerabilities (SQLi/XSS/secrets) and code smells/style issues
- **End-to-end pipeline:** Webhooks → Analysis service → PR comments + email notifications
- **Speed Insights:** Real-user performance telemetry via Vercel to keep UX fast

## Demo Flow (5 minutes)
1) **Connect GitHub:** OAuth + select repo
2) **Sync & Connect Repo:** One-click webhook enablement
3) **Open PR:** AI runs automatically; comments appear on the PR
4) **Review Output:** Severity badges, line references, “Action required” summary
5) **Resolve & Merge:** Fix in PR, rerun if needed

## Architecture
- **Frontend (Vite/React):** Dashboard for repos, reports, onboarding; Vercel-hosted, Speed Insights
- **API Service (Node/Express, Postgres):** Auth, repo sync/connect, reporting; Prometheus metrics
- **GitHub Service (Node/Express):** Webhook receiver, PR file fetch, posts comments; GitHub App/Bot token support
- **Analysis Service (FastAPI/gRPC):** Runs code analysis; returns vulnerabilities/style issues
- **Data:** Postgres (metadata), Mongo (analysis details), Redis (caching)
- **Infra:** Docker Compose for local/dev; Vercel for frontend; secrets via env files (no creds in git)

## Key Features to Show
- **PR comment sample:** Severity badges (Critical/High/Medium), “Action required”, grouped findings
- **Simple onboarding:** 3-step checklist (Connect, Sync repos, Connect a repo) in UI
- **Reports:** List of analyses with filters; analysis detail view
- **Notifications:** Email summary to reviewers (non-blocking)
- **Resilience:** Webhook retry helper; per-user repo rows (multi-collaborator sync)

## Recent Improvements
- **Homepage proof section:** Showcases PR comment output for credibility
- **Onboarding UX:** Checklist on Repos page to reduce confusion
- **GitHub App support:** Comments can be authored by app/bot (with fallback)
- **Performance:** Vercel Speed Insights integrated; focus on TTFB/CLS

## Metrics & Validation
- **Throughput:** 10k+ PRs analyzed (internal benchmark)
- **Findings:** 500+ vulnerabilities caught (simulated corpus)
- **Performance:** INP ~40ms; LCP ~2.3s (optimizing TTFB/CLS)
- **Uptime:** Dockerized stack; health checks on API/Analysis services

## Risks & Mitigations
- **Token scope/access:** GitHub App/Bot tokens, fallbacks, and clear install flow
- **Webhook reliability:** Retry endpoint; logging around webhook registration
- **Perf regressions:** Speed Insights + Prometheus metrics; static caching for frontend
- **False positives:** Severity grouping; actionable summaries; focus on critical/high first

## Differentiation (vs. competitors)
- **GitHub-native UX (vs. DeepSource/SonarCloud dashboards):** We post comments directly on PRs—no context switching.
- **Security-first AI (vs. static linting tools):** Severity-tagged security + quality checks; not just style/lint.
- **Fast onboarding (vs. CodeClimate/CI configs):** Connect GitHub and pick repos; no CI scripting required.
- **Per-user repo handling (vs. single-owner sync):** Collaborators can sync the same repo without conflicts/skips.
- **Resilience & fallbacks:** Webhook retry helper; app/bot/user token fallbacks to avoid missing comments.
- **Performance visibility:** Built-in real-user metrics via Vercel Speed Insights to keep UX responsive.

## Live Demo Checklist
- Vercel frontend deployed and reachable
- GitHub App/Bot token configured; repo connected; webhook active
- At least one PR ready to trigger analysis
- Email notifications configured (or mocked) for reviewers

## Budget / Resources (Illustrative)
| Budget Item                          | Description                                      | One-Time Cost |
|--------------------------------------|--------------------------------------------------|---------------|
| Frontend Engineer (contract)         | 200 hrs @ $90/hr                                 | $18,000       |
| Backend/API Engineer (contract)      | 200 hrs @ $100/hr                                | $20,000       |
| GitHub/DevOps Engineer (contract)    | 120 hrs @ $110/hr                                | $13,200       |
| Design/UX (contract)                 | 80 hrs @ $80/hr                                  | $6,400        |
| Test/QA Engineer (contract)          | 120 hrs @ $70/hr                                 | $8,400        |
| Tooling/Setup                        | CI/CD, basic monitoring setup, misc              | $2,500        |
| **Total One-Time Costs**             |                                                  | **$83,500**   |

| Budget Item                          | Description                                      | Monthly Cost  |
|--------------------------------------|--------------------------------------------------|---------------|
| Infra (Vercel + managed DBs/cache)   | Prod-grade hosting for FE/API/DB/cache           | ~$300–$600    |
| Monitoring/Alerts                    | Prom/Grafana/SaaS observability                  | ~$100–$200    |
| Email Delivery                       | SendGrid/SES tier                                | ~$50–$150     |
| Incidentals                          | Domain, backups, small SaaS tools                | ~$50–$100     |
| **Total Ongoing (Monthly)**          |                                                  | **~$500–$1,050** |

**Budget Summary:** One-time: ~$83,500; ongoing: ~$500–$1,050/month.

## Risk Management
| Risk Factor                                  | Probability | Impact | Risk Management Action                                                                                |
|----------------------------------------------|-------------|--------|-------------------------------------------------------------------------------------------------------|
| GitHub API/App changes break integration     | L           | H      | Stable APIs; robust error handling; monitor webhooks; re-register helpers                             |
| AI/static analysis high false positives      | M           | M      | Conservative defaults; severity grouping; tuning; overrides; plan custom rules                        |
| Pilot/user resistance to automated feedback  | M           | M      | Involve users; training; highlight time savings; allow per-repo opt-out                               |
| Free-tier/infra limits (Vercel/DB/email)     | M           | M      | Efficient queries/caching; monitor usage; plan upgrade path/budget                                    |
| Security/compliance (repo access/secrets)    | L           | H      | Least-privilege scopes; .env segregation; no secrets in git; document handling                        |
| Team availability (small team)               | M           | H      | Cross-train; maintain docs; prioritize backlog; identify backup help                                  |
| Analysis performance/latency too high        | M           | H      | Optimize hotspots; parallel/diff-only roadmap; cache; monitor RUM (Speed Insights)                    |
| External service outages (GitHub/LLM/email)  | M           | M      | Graceful degradation; retries; clear error surfacing; fallback channels                               |
| Scope creep vs. timeline                     | M           | H      | MVP-first; prioritize core; defer non-critical features; change control with sponsor                  |

## Communication Plan
| Audience                  | Purpose                         | Channel                 | Frequency            | Owner           |
|---------------------------|---------------------------------|-------------------------|----------------------|------------------|
| Sponsors/Advisors         | Status, risks, decisions        | Email/meeting           | Bi-weekly or as needed | Project Manager |
| Project Team              | Daily progress/blockers         | Stand-up/chat           | Daily (15 min)       | Project Manager |
| Stakeholders (pilot users)| Updates, feedback, training     | Email/demo sessions     | Per milestone/demo   | Project Manager |
| Docs/Asynchronous         | Decisions, designs, updates     | Repo docs/PRs/issues    | Continuous           | Team            |

## Quality / Testing Strategy
- **Levels:** Unit tests (API/services), integration tests (webhooks → analysis → comments), UI validation (onboarding, reports), and manual PR comment verification.
- **Health checks:** `/health` endpoints for API, GitHub Service, Analysis Service; `/metrics` for Prometheus.
- **Acceptance:** PR comment posted with severity tags on PR open/update; no critical errors in logs; web-vitals within targets; webhook deliveries succeed or are retried.
- **Perf checks:** Track PR comment latency and web-vitals via Vercel Speed Insights; optimize if thresholds are missed.

## Change Management
- Capture change requests via issues/PRs; assess impact on scope/timeline.
- Prioritize through the backlog; get sponsor approval for scope changes.
- Defer non-critical items to future milestones if risk to core delivery.

## Dependencies & Assumptions
- **External:** GitHub APIs/Webhooks/App install; Vercel hosting; Postgres/Mongo/Redis services; optional email provider (SendGrid/SES).
- **Assumptions:** Required tokens/scopes configured; target repos accessible; env files in place; services reachable (API/GitHub/Analysis).
- **Constraints:** Current analysis focused on Python; limited resources; relying on GitHub availability and rate limits.

## Metrics / Success Criteria
- **Adoption:** Connected repos; PRs analyzed per week.
- **Quality/Security:** Critical/high findings caught; false-positive rate; secrets/PII detections (if enabled).
- **Speed:** PR comment latency (target <30–60s typical); web-vitals RES >90 (CLS <0.1, LCP <2s).
- **Reliability:** Webhook success rate; analysis error rate; email delivery success (when enabled).

## Appendices
- **Architecture/Stack:** Frontend: Vite/React hosted on Vercel. Backend services (API, GitHub, Analysis) deployed on Render (Node/Express for API/GitHub; FastAPI/gRPC for Analysis). Data: Postgres (metadata), MongoDB (analysis details), Redis (caching). Observability: Prometheus `/metrics`, Vercel Speed Insights (RUM). Integration: GitHub App/OAuth.
- **Roadmap:** `ROADMAP.md` (current/short/mid/long-term).
- **Code/Setup:** `README.md`, `.env.example` files.
- **Testing/Quality:** See Quality section; service health endpoints; metrics.
- **Risk Register:** See Risk Management table.
- **Docs/Assets:** `FIXES_APPLIED.md` (recent changes), `PRESENTATION.md` (this deck), screenshots/proof (PR comment samples).
- **Repo/Links:** Main repo, Vercel deploy URL, GitHub App settings (internal).
- **Scripts (ops):** `health-check.sh`, `monitor-services.sh`, `init-databases.sh`, `backfill-webhooks.md`, `test-databases.js`, `test-grpc-connection.js`.
## Q&A Prep
- **Security:** How secrets are handled (.env, no commits), scopes required
- **Architecture:** Why split services; gRPC vs REST; DB choices
- **Performance:** How we keep comments fast; caching and async processing
- **Roadmap:** Multi-language support, IDE plugin, more permissions for GitHub App, Grafana/Prom metrics at scale

## Future Work / Next Steps
- Email Notifications: Production-ready alerts for completed analyses (fix current timeout issues)
- Subscription & Pricing: Launch paid tiers
- IDE Plugin: VS Code extension for pre-PR feedback
- Custom Rule Sets: Org-level policies and rules
- Team Management: RBAC for larger teams
- BYOK: Allow users to bring their own Gemini keys for higher limits
- Multi-Language: Extend beyond Python (JS/TS/Java/Go)
- Setup Demo Video: Interactive onboarding walkthrough
- Auto-fix suggestions: Inline patches/“apply suggestion” for common issues
- Observability at scale: Prometheus/Grafana alerts for webhooks, analysis latency, error rates

## Conclusion
- GitHub-native AI reviewer that keeps feedback where developers work—on the PR.
- Clear value: faster reviews, consistent security/quality checks, and actionable severity-tagged comments.
- Ready to demo: simple onboarding, real PR output, and measurable performance via Speed Insights.
- Looking ahead: expand languages, deepen integrations (IDE, GitHub App), and strengthen reliability/observability.
