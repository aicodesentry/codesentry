# Centralized Security Guardrails

CodeSentry enforces guardrails as a centralized control model, not per-service ad hoc behavior.

## 1) Network and Ingress
- Public ingress allowed only for `api-service`.
- `analysis-service` may be private/internal based on environment.
- GitHub webhook endpoint: `POST /webhooks/github` only.

## 2) Secret Authority
- Secrets must come from Secret Manager in deployed environments.
- No production secrets in `.env` files or source code.
- Rotate `JWT_SECRET`, `GITHUB_WEBHOOK_SECRET`, and `GITHUB_SERVICE_INTERNAL_SECRET` regularly.

## 3) Internal Service Authentication
- API -> GitHub service calls require `x-internal-secret`.
- GitHub service rejects requests missing/mismatching the shared secret.
- Shared secret: `GITHUB_SERVICE_INTERNAL_SECRET`.

## 4) Input Guardrails
- Webhook signature verification for all GitHub events.
- Webhook idempotency via `webhook_deliveries.delivery_id`.
- Payload constraints for oversized fields and batch event size.
- Strict validation for finding/suppression APIs (UUID/status/severity/reason checks).

## 5) Authorization and Audit
- API RBAC scope is repository owner based.
- All finding status changes and suppression mutations write `audit_logs` entries.

## 6) Analysis Guardrails
- Large file/diff limits are enforced in analysis pipeline paths.
- High-confidence findings only for inline PR comments.

## 7) CI Guardrails
- Secret scanning on every PR/push.
- API and analysis tests required.
- Branch protection should require `Guardrails` workflow success before merge.

## 8) Monitoring Guardrails
- Uptime checks for API and analysis health endpoints.
- Alerts for 5xx, latency spikes, and error bursts.
- Correlation IDs in logs for cross-service tracing.
