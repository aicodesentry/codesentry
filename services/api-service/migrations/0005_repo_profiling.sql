-- Repo profiling: adds profile storage and background job queue columns

ALTER TABLE repositories
  ADD COLUMN IF NOT EXISTS profile_status     VARCHAR(20) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS profile_priority   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS profile_data       JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS profile_confidence DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS profile_updated_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS profile_queued_at  TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_repositories_profile_queue
  ON repositories (profile_priority DESC, profile_queued_at ASC)
  WHERE profile_status IN ('queued', 'stale', 'urgent');
