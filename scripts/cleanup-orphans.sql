-- Cleanup orphaned data
-- Run: psql $DATABASE_URL < scripts/cleanup-orphans.sql
--
-- Safety latch:
--   psql "$DATABASE_URL" \
--     -v ON_ERROR_STOP=1 \
--     -c "SET mitig8it.allow_destructive_maintenance = 'true';" \
--     -f scripts/cleanup-orphans.sql

DO $$
BEGIN
  IF current_setting('mitig8it.allow_destructive_maintenance', true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION
      'Refusing to run destructive cleanup without SET mitig8it.allow_destructive_maintenance = ''true''';
  END IF;
END $$;

-- Remove repositories with no owner and no installation (unreachable ghosts)
DELETE FROM repositories WHERE owner_id IS NULL AND installation_id IS NULL;

-- Drop legacy tables that are no longer used
DROP TABLE IF EXISTS analysis;
DROP TABLE IF EXISTS repository_config;

-- Verify
SELECT 'repositories' AS table_name, COUNT(*) AS rows FROM repositories
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'findings', COUNT(*) FROM findings
UNION ALL SELECT 'analysis_runs', COUNT(*) FROM analysis_runs;
