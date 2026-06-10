# P1 Rollout

`P1` switches the API service from runtime schema mutation to explicit migrations.

## 1. Apply API migrations

From `services/api-service`:

```bash
npm run db:migrate
```

For production, the GitHub Actions API deploy workflow now runs this automatically before deployment.

## 2. Verify schema state

```bash
npm run db:verify
psql "$DATABASE_URL" -f ../../scripts/p1-verification.sql
```

Expected results:

- `db:verify` exits successfully with no pending migrations
- all orphan-count queries return `0`
- the listed foreign-key constraints exist

`convalidated = false` is acceptable initially because the `P1` foreign keys are added as `NOT VALID` to avoid breaking production during rollout. After data cleanup, validate them explicitly.

## 3. Deploy API

After the migration step succeeds, deploy the new API image. Production startup will reject pending migrations instead of mutating the schema at boot.
