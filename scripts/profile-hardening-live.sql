-- Run against the live database after deploying the code changes.
-- Purpose:
-- 1. Backfill installation_id for legacy repository rows
-- 2. Requeue failed / stale profiling jobs
-- 3. Clear stale profile errors before retry

WITH repo_installation_map AS (
  SELECT
    ra.repository_id,
    MIN(ui.installation_id) AS installation_id,
    COUNT(DISTINCT ui.installation_id) AS installation_count
  FROM repository_access ra
  JOIN user_installations ui ON ui.user_id = ra.user_id
  GROUP BY ra.repository_id
)
UPDATE repositories r
SET installation_id = rim.installation_id
FROM repo_installation_map rim
WHERE r.id = rim.repository_id
  AND r.installation_id IS NULL
  AND rim.installation_count = 1;

UPDATE repositories
SET profile_status = 'urgent',
    profile_priority = 2,
    profile_queued_at = NOW(),
    settings = settings - 'profile_error'
WHERE profile_status IN ('failed', 'profiling');

-- Verification queries
SELECT COUNT(*) AS repos_missing_installation_id
FROM repositories
WHERE installation_id IS NULL;

SELECT profile_status, COUNT(*) AS repos
FROM repositories
GROUP BY profile_status
ORDER BY profile_status;
