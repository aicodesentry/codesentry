#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

git -C "$ROOT_DIR" config core.hooksPath .githooks
chmod +x "$ROOT_DIR/.githooks/pre-push"

cat <<'EOF'
Git hooks installed.

Active hook path:
- .githooks

Current protection:
- blocks direct pushes to main
- blocks direct pushes to master

Use feature branches and PRs for integration to main.
EOF
