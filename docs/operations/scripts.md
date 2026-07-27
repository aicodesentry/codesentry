# Scripts

The `scripts/` directory is intentionally kept in Git. It contains operational helpers, verification queries, and one-off maintenance tools.

## Safety levels

- Safe by default:
  - `health-check.sh`
  - `monitor-services.sh`
  - `validate-env.sh`
  - `p0-verification.sql`
  - `p1-verification.sql`
  - `e2e-happy-path.sh`
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

## Public repo guidance

Keeping `scripts/` in GitHub is fine as long as:

- scripts do not embed secrets,
- dangerous scripts are clearly labeled,
- production-only scripts require an explicit opt-in,
- operational docs do not instruct plaintext credential handling.
