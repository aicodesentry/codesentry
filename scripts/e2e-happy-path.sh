#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-http://localhost:3000}"
ANALYSIS_URL="${ANALYSIS_URL:-http://localhost:8001}"
INTERNAL_SECRET="${GITHUB_SERVICE_INTERNAL_SECRET:-${ANALYSIS_SERVICE_INTERNAL_SECRET:-}}"
METRICS_SECRET="${METRICS_AUTH_TOKEN:-${GITHUB_SERVICE_INTERNAL_SECRET:-}}"

echo "[1/4] Health checks"
curl -fsS "$API_URL/health" >/dev/null
curl -fsS "$ANALYSIS_URL/health" >/dev/null

echo "[2/4] Metrics endpoint"
if [ -n "$METRICS_SECRET" ]; then
  curl -fsS "$API_URL/metrics" -H "x-internal-secret: $METRICS_SECRET" | grep -q "codesentry_http_request_duration_seconds"
else
  curl -fsS "$API_URL/metrics" | grep -q "codesentry_http_request_duration_seconds"
fi

echo "[3/4] Analysis pipeline smoke test"
analysis_args=(-fsS -X POST "$ANALYSIS_URL/analyze/pr" -H 'content-type: application/json')
if [ -n "$INTERNAL_SECRET" ]; then
  analysis_args+=(-H "x-internal-secret: $INTERNAL_SECRET")
fi
curl "${analysis_args[@]}" \
  -d '{
    "repository_full_name":"acme/demo",
    "pull_request_number":1,
    "commit_sha":"deadbeef",
    "files":[{"path":"api/db.js","patch":"+const query = \"SELECT * FROM users WHERE id = \" + userId"}]
  }' | grep -q "findings"

echo "[4/4] API auth guard"
status=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/repositories")
if [ "$status" != "401" ]; then
  echo "Expected 401 for unauthenticated repo list, got $status"
  exit 1
fi

echo "E2E happy path checks passed"
