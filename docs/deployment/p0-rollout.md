# P0 Rollout

Apply these steps in order on the production database and service environment.

## 1. Backup

Take a full Neon/Postgres backup or point-in-time restore bookmark before any mutation.

## 2. Set required secrets

The following must be present in the runtime environment before restarting services:

- `ENCRYPTION_KEY`
- `GITHUB_SERVICE_INTERNAL_SECRET`
- `JWT_SECRET`
- `GITHUB_WEBHOOK_SECRET`

Optional:

- `METRICS_AUTH_TOKEN`

## 3. Apply schema migration

```bash
psql "$DATABASE_URL" -f scripts/p0-live-migration.sql
```

## 4. Backfill repository access

```bash
DATABASE_URL="$DATABASE_URL" node scripts/backfill-repository-access.js
```

## 5. Encrypt existing GitHub tokens

```bash
ENCRYPTION_KEY="$ENCRYPTION_KEY" DATABASE_URL="$DATABASE_URL" node scripts/migrate-encrypt-tokens.js
```

## 6. Verify the database state

```bash
psql "$DATABASE_URL" -f scripts/p0-verification.sql
```

Expected results:

- `plaintext_token_rows = 0`
- `repositories_without_access = 0`
- `audit_logs_table_exists = 1`
- `idx_findings_repo_pr_fingerprint` present

`shared_installations` and `cross_repo_duplicate_fingerprints` are informational checks. Non-zero values are expected in a shared-install environment.

## 7. Restart services

Restart `api-service`, `github-service`, and `analysis-service` with the updated environment.

## 8. Smoke test

```bash
./scripts/e2e-happy-path.sh
```

If `analysis-service` or `/metrics` are protected, export `GITHUB_SERVICE_INTERNAL_SECRET` first.
