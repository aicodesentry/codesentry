BEGIN;

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  repository_id UUID,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS repository_access (
  user_id UUID NOT NULL,
  repository_id UUID NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, repository_id)
);

ALTER TABLE repository_access
  ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'admin';

ALTER TABLE repository_access
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();

ALTER TABLE repository_access
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_repository_access_user_id ON repository_access (user_id);
CREATE INDEX IF NOT EXISTS idx_repository_access_repository_id ON repository_access (repository_id);

INSERT INTO repository_access (user_id, repository_id, role)
SELECT owner_id, id, 'admin'
FROM repositories
WHERE owner_id IS NOT NULL
ON CONFLICT (user_id, repository_id) DO NOTHING;

INSERT INTO repository_access (user_id, repository_id, role)
SELECT user_id, id, 'admin'
FROM repositories
WHERE user_id IS NOT NULL
ON CONFLICT (user_id, repository_id) DO NOTHING;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'findings_fingerprint_key'
  ) THEN
    ALTER TABLE findings DROP CONSTRAINT findings_fingerprint_key;
  END IF;
END $$;

DROP INDEX IF EXISTS findings_fingerprint_key;
DROP INDEX IF EXISTS idx_findings_fingerprint;

CREATE UNIQUE INDEX IF NOT EXISTS idx_findings_repo_pr_fingerprint
  ON findings (repository_id, pull_request_id, fingerprint);

COMMIT;
