#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"
EXAMPLE_FILE="${ROOT_DIR}/.env.example"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "ERROR: missing required command: $1"
    exit 1
  fi
}

replace_or_append_env() {
  local key="$1"
  local value="$2"

  if grep -q "^${key}=" "$ENV_FILE"; then
    perl -0pi -e "s#^${key}=.*#${key}=${value}#m" "$ENV_FILE"
  else
    printf '\n%s=%s\n' "$key" "$value" >> "$ENV_FILE"
  fi
}

ensure_secret() {
  local key="$1"
  local current
  current="$(grep "^${key}=" "$ENV_FILE" 2>/dev/null | cut -d= -f2- || true)"

  if [ -z "$current" ] || [[ "$current" == change-me* ]]; then
    replace_or_append_env "$key" "$(openssl rand -hex 32)"
  fi
}

require_cmd openssl

if [ ! -f "$EXAMPLE_FILE" ]; then
  echo "ERROR: missing $EXAMPLE_FILE"
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  cp "$EXAMPLE_FILE" "$ENV_FILE"
  echo "Created .env from .env.example"
else
  echo "Using existing .env"
fi

ensure_secret "JWT_SECRET"
ensure_secret "ENCRYPTION_KEY"
ensure_secret "GITHUB_WEBHOOK_SECRET"
ensure_secret "GITHUB_SERVICE_INTERNAL_SECRET"

cat <<'EOF'

Local development bootstrap is ready.

Next steps:
1. Fill in real GitHub values in .env:
   - GITHUB_CLIENT_ID
   - GITHUB_CLIENT_SECRET
   - GITHUB_APP_ID
   - GITHUB_APP_PRIVATE_KEY
2. Install the local git safety hook:
   ./scripts/install-git-hooks.sh
3. Start the stack:
   docker-compose up --build

Notes:
- You can run the frontend and services locally against the root .env.
- GitHub OAuth, app installation, and webhook flows need real GitHub credentials.
- The pre-push hook blocks direct pushes to main and master.
EOF
