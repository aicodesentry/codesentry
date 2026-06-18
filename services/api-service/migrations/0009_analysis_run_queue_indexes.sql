CREATE INDEX IF NOT EXISTS idx_analysis_runs_pending_queue
  ON analysis_runs (created_at ASC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_analysis_runs_stale_running
  ON analysis_runs (started_at ASC)
  WHERE status = 'running';
