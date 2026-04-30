-- Profile hardening:
-- 1. Backfill repositories.installation_id where a unique user_installations mapping exists
-- 2. Ensure profile bookkeeping columns are never null

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
SET profile_status = COALESCE(profile_status, 'pending'),
    profile_priority = COALESCE(profile_priority, 0),
    profile_data = COALESCE(profile_data, '{}'::jsonb);

ALTER TABLE repositories
  ALTER COLUMN profile_status SET DEFAULT 'pending',
  ALTER COLUMN profile_status SET NOT NULL,
  ALTER COLUMN profile_priority SET DEFAULT 0,
  ALTER COLUMN profile_priority SET NOT NULL,
  ALTER COLUMN profile_data SET DEFAULT '{}'::jsonb,
  ALTER COLUMN profile_data SET NOT NULL;
