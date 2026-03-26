#!/usr/bin/env bash
# Validates that the root .env has all required variables set.
# Usage: ./scripts/validate-env.sh [path-to-env-file]
set -euo pipefail

ENV_FILE="${1:-.env}"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found. Run: cp .env.example .env"
  exit 1
fi

REQUIRED=(
  DATABASE_URL
  JWT_SECRET
  GITHUB_CLIENT_ID
  GITHUB_CLIENT_SECRET
  GITHUB_APP_ID
  GITHUB_APP_PRIVATE_KEY
  GITHUB_WEBHOOK_SECRET
  GITHUB_SERVICE_INTERNAL_SECRET
)

missing=0
for var in "${REQUIRED[@]}"; do
  val=$(grep "^${var}=" "$ENV_FILE" 2>/dev/null | cut -d= -f2- || true)
  if [ -z "$val" ] || echo "$val" | grep -q "change-me"; then
    echo "  MISSING or placeholder: $var"
    missing=$((missing + 1))
  fi
done

if [ $missing -eq 0 ]; then
  echo "All required variables are set."
else
  echo ""
  echo "$missing variable(s) need real values in $ENV_FILE"
  exit 1
fi
