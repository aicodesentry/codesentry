# Scripts

This directory is intentionally kept in Git. It contains operational helpers, verification queries, and one-off maintenance tools.

## Safety levels

- Safe by default:
  - `health-check.sh`
  - `monitor-services.sh`
  - `validate-env.sh`
  - `p0-verification.sql`
  - `p1-verification.sql`
  - `e2e-happy-path.sh`
  - `live-suggestion-validation.sh`
- One-time migration / maintenance:
  - `migrate-encrypt-tokens.js`
  - `backfill-repository-access.js`
  - `p0-live-migration.sql`
- Destructive or admin-only:
  - `cleanup-orphans.sql`
  - `init-databases.sh`

## Rules for using any script here

- Never commit live credentials, DB URLs, access tokens, or service-account files.
- Prefer environment variables or secret managers for all sensitive values.
- Treat `cleanup-*`, `backfill-*`, and `init-*` scripts as production-impacting until reviewed.
- Run destructive scripts only after a database backup and only with explicit confirmation flags.
- Do not copy GitHub or OAuth tokens into shell history, docs, or terminal transcripts.

## Live PR validation

`live-suggestion-validation.sh` creates a temporary branch and PR on a target GitHub repository, commits obvious vulnerable fixture files, and polls GitHub for:

- the Mitig8it review summary marker `<!-- mitig8it-review -->`
- inline review comments containing GitHub suggestion blocks

Example:

```bash
TARGET_REPO=owner/repo ./scripts/live-suggestion-validation.sh
```

Optional environment variables:

- `BASE_BRANCH` default `main`
- `BRANCH_PREFIX` default `mitig8it/live-suggestion-validation`
- `APP_SLUG` default `mitig8it`
- `POLL_SECONDS` default `15`
- `MAX_POLLS` default `20`
- `API_URL` optional local/prod API healthcheck
- `ANALYSIS_URL` optional local/prod analysis healthcheck

## Public repo guidance

Keeping `scripts/` in GitHub is fine as long as:

- scripts do not embed secrets,
- dangerous scripts are clearly labeled,
- production-only scripts require an explicit opt-in,
- operational docs do not instruct plaintext credential handling.
