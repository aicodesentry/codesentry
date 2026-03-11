# AI Code Review Assistant — Updated Roadmap (Dec 2025)

## Vision
GitHub-native AI reviewer that posts severity-tagged security and quality feedback directly on PRs—fast onboarding, consistent guardrails, and actionable fixes without leaving GitHub.

## Current State (Dec 2025)
- **Stack:** Vercel (Vite/React) frontend; Node/Express API; GitHub Service (webhooks/comments); Analysis Service (FastAPI + gRPC); Postgres (metadata); MongoDB (analysis details); Redis (caching); Prometheus metrics; Vercel Speed Insights for RUM.
- **Integrations:** GitHub App/Bot for PR comments (with user-token fallback), webhooks for PR events.
- **Features:** PR comment summaries with severity badges, repo onboarding checklist, webhook retry helper, per-user repo handling (shared repos), reports/analysis detail view, email notification path (needs production hardening).
- **Perf:** INP ~40ms, LCP ~2.3s, CLS 0.21 (goal <0.1); Speed Insights live.

## Short-Term (next 4–6 weeks)
- **PR Comments via GitHub App-first:** Ensure app token is primary; remove dependency on user tokens; clearer install UX.
- **Webhook health & retries:** Automated checks and self-heal for missing/failed webhooks.
- **Email notifications (prod-ready):** Resolve timeout issues; reliable delivery for completed analyses.
- **Frontend perf wins:** Fix CLS (set explicit dimensions for hero/proof assets), improve TTFB/LCP with static caching and optimized assets.
- **Secrets/PII scanning:** Add dedicated detectors to reduce risk from “vibe coding”/AI-assisted commits.

## Mid-Term (3–6 months)
- **Multi-language support:** Extend beyond Python to JS/TS/Java/Go.
- **IDE plugin (VS Code):** Pre-PR feedback inline to reduce cycle time.
- **Custom rules/policies:** Org-level controls for severity thresholds, paths, and rule sets.
- **Team/RBAC:** Role-based access and repo/team-level reporting.
- **Pricing & tiers:** Launch paid plans with usage/limits; BYOK prep for higher limits.
- **Onboarding assets:** Interactive setup demo video; in-app quickstart.
- **Auto-fix suggestions:** “Apply suggestion”/patch snippets for common issues.

## Long-Term (6–12 months)
- **BYOK for LLMs:** Allow org/user-supplied keys (e.g., Gemini/OpenAI) for higher quotas/custom models.
- **Advanced analytics:** Trend reports, SLA/SLO dashboards; webhook/analysis latency/error surfacing.
- **Observability at scale:** Prometheus/Grafana alerts for webhooks, analysis latency, error rates.
- **Smarter analysis:** Diff-only/parallel analysis for large PRs; ML-based prioritization to cut false positives.
- **Enterprise features:** SSO, audit logs, deeper GitHub App controls, policy enforcement.

## Success Metrics
- **Adoption:** Connected repos and PRs analyzed per week.
- **Quality/Security:** Critical/high findings caught; false-positive rate; secrets/PII detections.
- **Speed:** PR comment latency (target <30–60s for typical PRs); web-vitals RES >90 (CLS <0.1, LCP <2s).
- **Reliability:** Webhook success rate; analysis error rate; email delivery success.

## Risks & Mitigations
- **Token/app scope issues:** Clear install flows; app-first commenting; fallbacks and health checks.
- **Webhook fragility:** Automated retries, monitoring, and re-registration.
- **False positives/coverage:** Severity grouping, custom rules, and tuning from user feedback.
- **Performance regression:** Continuous RUM (Speed Insights) and service metrics; static caching and asset optimization.
