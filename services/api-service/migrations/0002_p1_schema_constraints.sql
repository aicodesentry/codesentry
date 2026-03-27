DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_installations_user_id_fkey') THEN
    ALTER TABLE user_installations
      ADD CONSTRAINT user_installations_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_installations_installation_id_fkey') THEN
    ALTER TABLE user_installations
      ADD CONSTRAINT user_installations_installation_id_fkey
      FOREIGN KEY (installation_id) REFERENCES installations(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'repositories_installation_id_fkey') THEN
    ALTER TABLE repositories
      ADD CONSTRAINT repositories_installation_id_fkey
      FOREIGN KEY (installation_id) REFERENCES installations(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'repositories_owner_id_fkey') THEN
    ALTER TABLE repositories
      ADD CONSTRAINT repositories_owner_id_fkey
      FOREIGN KEY (owner_id) REFERENCES users(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'repository_access_user_id_fkey') THEN
    ALTER TABLE repository_access
      ADD CONSTRAINT repository_access_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'repository_access_repository_id_fkey') THEN
    ALTER TABLE repository_access
      ADD CONSTRAINT repository_access_repository_id_fkey
      FOREIGN KEY (repository_id) REFERENCES repositories(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pull_requests_repository_id_fkey') THEN
    ALTER TABLE pull_requests
      ADD CONSTRAINT pull_requests_repository_id_fkey
      FOREIGN KEY (repository_id) REFERENCES repositories(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'analysis_runs_repository_id_fkey') THEN
    ALTER TABLE analysis_runs
      ADD CONSTRAINT analysis_runs_repository_id_fkey
      FOREIGN KEY (repository_id) REFERENCES repositories(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'analysis_runs_pull_request_id_fkey') THEN
    ALTER TABLE analysis_runs
      ADD CONSTRAINT analysis_runs_pull_request_id_fkey
      FOREIGN KEY (pull_request_id) REFERENCES pull_requests(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'findings_repository_id_fkey') THEN
    ALTER TABLE findings
      ADD CONSTRAINT findings_repository_id_fkey
      FOREIGN KEY (repository_id) REFERENCES repositories(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'findings_pull_request_id_fkey') THEN
    ALTER TABLE findings
      ADD CONSTRAINT findings_pull_request_id_fkey
      FOREIGN KEY (pull_request_id) REFERENCES pull_requests(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'findings_analysis_run_id_fkey') THEN
    ALTER TABLE findings
      ADD CONSTRAINT findings_analysis_run_id_fkey
      FOREIGN KEY (analysis_run_id) REFERENCES analysis_runs(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'suppressions_finding_id_fkey') THEN
    ALTER TABLE suppressions
      ADD CONSTRAINT suppressions_finding_id_fkey
      FOREIGN KEY (finding_id) REFERENCES findings(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'suppressions_repository_id_fkey') THEN
    ALTER TABLE suppressions
      ADD CONSTRAINT suppressions_repository_id_fkey
      FOREIGN KEY (repository_id) REFERENCES repositories(id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'suppressions_suppressed_by_fkey') THEN
    ALTER TABLE suppressions
      ADD CONSTRAINT suppressions_suppressed_by_fkey
      FOREIGN KEY (suppressed_by) REFERENCES users(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_user_id_fkey') THEN
    ALTER TABLE audit_logs
      ADD CONSTRAINT audit_logs_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_repository_id_fkey') THEN
    ALTER TABLE audit_logs
      ADD CONSTRAINT audit_logs_repository_id_fkey
      FOREIGN KEY (repository_id) REFERENCES repositories(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'webhook_events_repository_id_fkey') THEN
    ALTER TABLE webhook_events
      ADD CONSTRAINT webhook_events_repository_id_fkey
      FOREIGN KEY (repository_id) REFERENCES repositories(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pull_requests_repository_id ON pull_requests (repository_id);
CREATE INDEX IF NOT EXISTS idx_user_installations_installation_id ON user_installations (installation_id);
CREATE INDEX IF NOT EXISTS idx_suppressions_repository_id ON suppressions (repository_id);
CREATE INDEX IF NOT EXISTS idx_suppressions_finding_id ON suppressions (finding_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_repository_id ON audit_logs (repository_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_repository_id ON webhook_events (repository_id);
