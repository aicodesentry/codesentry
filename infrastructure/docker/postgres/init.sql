-- =============================================================================
-- Mitig8it Database Initialization Script
-- PostgreSQL 15+
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables in reverse-dependency order
DROP TABLE IF EXISTS audit_logs    CASCADE;
DROP TABLE IF EXISTS suppressions  CASCADE;
DROP TABLE IF EXISTS findings      CASCADE;
DROP TABLE IF EXISTS analysis_runs CASCADE;
DROP TABLE IF EXISTS pull_requests CASCADE;
DROP TABLE IF EXISTS webhook_deliveries CASCADE;
DROP TABLE IF EXISTS repositories  CASCADE;
DROP TABLE IF EXISTS users         CASCADE;
DROP TABLE IF EXISTS installations CASCADE;
DROP FUNCTION IF EXISTS set_updated_at() CASCADE;

-- Auto-update updated_at trigger function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- GitHub App installations
-- =============================================================================
CREATE TABLE installations (
  id               BIGINT       PRIMARY KEY,
  account_login    VARCHAR(255) NOT NULL,
  account_type     VARCHAR(50)  NOT NULL,
  target_type      VARCHAR(50),
  html_url         VARCHAR(500),
  permissions      JSONB,
  events           TEXT[],
  status           VARCHAR(50)  NOT NULL DEFAULT 'active',
  installed_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_installations_updated_at
  BEFORE UPDATE ON installations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- Users (GitHub OAuth)
-- =============================================================================
CREATE TABLE users (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id        BIGINT       UNIQUE NOT NULL,
  github_username  VARCHAR(255) NOT NULL,
  github_email     VARCHAR(255),
  avatar_url       VARCHAR(500),
  name             VARCHAR(255),
  github_token     TEXT,
  installation_id  BIGINT       REFERENCES installations(id) ON DELETE SET NULL,
  created_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- Repositories
-- =============================================================================
CREATE TABLE repositories (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id        BIGINT       UNIQUE NOT NULL,
  installation_id  BIGINT       REFERENCES installations(id) ON DELETE SET NULL,
  owner_id         UUID         REFERENCES users(id) ON DELETE SET NULL,
  name             VARCHAR(255) NOT NULL,
  full_name        VARCHAR(500) NOT NULL,
  private          BOOLEAN      NOT NULL DEFAULT false,
  default_branch   VARCHAR(255) NOT NULL DEFAULT 'main',
  language         VARCHAR(100),
  html_url         VARCHAR(500),
  clone_url        VARCHAR(500),
  webhook_id       BIGINT,
  is_active        BOOLEAN      NOT NULL DEFAULT true,
  baseline_set     BOOLEAN      NOT NULL DEFAULT false,
  settings         JSONB        NOT NULL DEFAULT '{}',
  created_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_repositories_updated_at
  BEFORE UPDATE ON repositories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- Pull Requests
-- =============================================================================
CREATE TABLE pull_requests (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id    UUID         REFERENCES repositories(id) ON DELETE CASCADE,
  github_pr_id     BIGINT,
  pr_number        INTEGER      NOT NULL,
  title            VARCHAR(1000),
  body             TEXT,
  state            VARCHAR(50),
  head_sha         VARCHAR(40),
  base_sha         VARCHAR(40),
  head_branch      VARCHAR(255),
  base_branch      VARCHAR(255),
  author           VARCHAR(255),
  html_url         VARCHAR(500),
  draft            BOOLEAN      NOT NULL DEFAULT false,
  created_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
  merged_at        TIMESTAMP,
  UNIQUE (repository_id, pr_number)
);

CREATE TRIGGER trg_pull_requests_updated_at
  BEFORE UPDATE ON pull_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- Analysis Runs
-- =============================================================================
CREATE TABLE analysis_runs (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id        UUID        REFERENCES repositories(id) ON DELETE CASCADE,
  pull_request_id      UUID        REFERENCES pull_requests(id) ON DELETE SET NULL,
  pr_number            INTEGER,
  commit_sha           VARCHAR(40),
  status               VARCHAR(50) NOT NULL DEFAULT 'pending',
  triggered_by         VARCHAR(50),
  files_analyzed       INTEGER     NOT NULL DEFAULT 0,
  findings_count       INTEGER     NOT NULL DEFAULT 0,
  critical_count       INTEGER     NOT NULL DEFAULT 0,
  high_count           INTEGER     NOT NULL DEFAULT 0,
  medium_count         INTEGER     NOT NULL DEFAULT 0,
  low_count            INTEGER     NOT NULL DEFAULT 0,
  github_check_run_id  BIGINT,
  summary_comment_id   BIGINT,
  started_at           TIMESTAMP,
  completed_at         TIMESTAMP,
  error_message        TEXT,
  created_at           TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Findings (canonical finding schema)
-- =============================================================================
CREATE TABLE findings (
  id                    UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id         UUID           REFERENCES repositories(id) ON DELETE CASCADE,
  installation_id       BIGINT,
  pull_request_number   INTEGER,
  pull_request_id       UUID           REFERENCES pull_requests(id) ON DELETE SET NULL,
  analysis_run_id       UUID           REFERENCES analysis_runs(id) ON DELETE SET NULL,
  commit_sha            VARCHAR(40),
  fingerprint           VARCHAR(64)    NOT NULL,
  rule_id               VARCHAR(100)   NOT NULL,
  title                 VARCHAR(500)   NOT NULL,
  description           TEXT           NOT NULL,
  category              VARCHAR(100)   NOT NULL,
  cwe_id                VARCHAR(20),
  owasp_category        VARCHAR(50),
  severity              VARCHAR(20)    NOT NULL,
  confidence            DECIMAL(3,2)   NOT NULL CHECK (confidence >= 0.00 AND confidence <= 1.00),
  exploitability        VARCHAR(20),
  file_path             VARCHAR(1000)  NOT NULL,
  line_start            INTEGER,
  line_end              INTEGER,
  code_snippet          TEXT,
  evidence              TEXT,
  exploit_scenario      TEXT,
  remediation           TEXT,
  remediation_patch     TEXT,
  status                VARCHAR(50)    NOT NULL DEFAULT 'open',
  dismissal_reason      TEXT,
  inline_comment_id     BIGINT,
  is_baseline           BOOLEAN        NOT NULL DEFAULT false,
  created_at            TIMESTAMP      NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP      NOT NULL DEFAULT NOW(),
  first_seen_at         TIMESTAMP      NOT NULL DEFAULT NOW(),
  last_seen_at          TIMESTAMP      NOT NULL DEFAULT NOW(),
  UNIQUE (repository_id, fingerprint)
);

CREATE TRIGGER trg_findings_updated_at
  BEFORE UPDATE ON findings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- Suppressions
-- =============================================================================
CREATE TABLE suppressions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id      UUID        REFERENCES findings(id) ON DELETE CASCADE,
  repository_id   UUID        REFERENCES repositories(id) ON DELETE CASCADE,
  fingerprint     VARCHAR(64) NOT NULL,
  reason          VARCHAR(50) NOT NULL,
  notes           TEXT,
  suppressed_by   UUID        REFERENCES users(id) ON DELETE SET NULL,
  expires_at      TIMESTAMP,
  created_at      TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Audit Log (append-only)
-- =============================================================================
CREATE TABLE audit_logs (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID         REFERENCES users(id) ON DELETE SET NULL,
  repository_id   UUID         REFERENCES repositories(id) ON DELETE SET NULL,
  action          VARCHAR(100) NOT NULL,
  resource_type   VARCHAR(50),
  resource_id     UUID,
  details         JSONB,
  ip_address      VARCHAR(50),
  created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Webhook deliveries (idempotency + auditability)
-- =============================================================================
CREATE TABLE webhook_deliveries (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id       VARCHAR(255)  NOT NULL UNIQUE,
  event_type        VARCHAR(100)  NOT NULL,
  action            VARCHAR(100),
  processing_status VARCHAR(50)   NOT NULL DEFAULT 'received',
  error_message     TEXT,
  received_at       TIMESTAMP     NOT NULL DEFAULT NOW(),
  processed_at      TIMESTAMP
);

-- =============================================================================
-- Indexes
-- =============================================================================

-- installations
CREATE INDEX idx_installations_status         ON installations (status);
CREATE INDEX idx_installations_account_login   ON installations (account_login);

-- users
CREATE INDEX idx_users_github_id              ON users (github_id);
CREATE INDEX idx_users_installation_id        ON users (installation_id);

-- repositories
CREATE INDEX idx_repositories_installation_id ON repositories (installation_id);
CREATE INDEX idx_repositories_owner_id        ON repositories (owner_id);
CREATE INDEX idx_repositories_full_name       ON repositories (full_name);
CREATE INDEX idx_repositories_is_active       ON repositories (is_active);

-- pull_requests
CREATE INDEX idx_pull_requests_repository_id  ON pull_requests (repository_id);
CREATE INDEX idx_pull_requests_state          ON pull_requests (state);
CREATE INDEX idx_pull_requests_head_sha       ON pull_requests (head_sha);

-- analysis_runs
CREATE INDEX idx_analysis_runs_repository_id   ON analysis_runs (repository_id);
CREATE INDEX idx_analysis_runs_pull_request_id ON analysis_runs (pull_request_id);
CREATE INDEX idx_analysis_runs_status          ON analysis_runs (status);
CREATE INDEX idx_analysis_runs_created_at      ON analysis_runs (created_at DESC);

-- findings (most query-critical indexes)
CREATE INDEX idx_findings_repository_id        ON findings (repository_id);
CREATE INDEX idx_findings_pull_request_id      ON findings (pull_request_id);
CREATE INDEX idx_findings_analysis_run_id      ON findings (analysis_run_id);
CREATE INDEX idx_findings_fingerprint          ON findings (fingerprint);
CREATE INDEX idx_findings_status               ON findings (status);
CREATE INDEX idx_findings_severity             ON findings (severity);
CREATE INDEX idx_findings_category             ON findings (category);
CREATE INDEX idx_findings_is_baseline          ON findings (is_baseline);
CREATE INDEX idx_findings_created_at           ON findings (created_at DESC);
-- Composite for dashboard queries
CREATE INDEX idx_findings_repo_status_sev      ON findings (repository_id, status, severity);

-- suppressions
CREATE INDEX idx_suppressions_finding_id      ON suppressions (finding_id);
CREATE INDEX idx_suppressions_repository_id   ON suppressions (repository_id);
CREATE INDEX idx_suppressions_fingerprint     ON suppressions (fingerprint);

-- audit_logs
CREATE INDEX idx_audit_logs_user_id           ON audit_logs (user_id);
CREATE INDEX idx_audit_logs_repository_id     ON audit_logs (repository_id);
CREATE INDEX idx_audit_logs_created_at        ON audit_logs (created_at DESC);

-- webhook_deliveries
CREATE INDEX idx_webhook_deliveries_event_type ON webhook_deliveries (event_type);
CREATE INDEX idx_webhook_deliveries_status     ON webhook_deliveries (processing_status);
CREATE INDEX idx_webhook_deliveries_received_at ON webhook_deliveries (received_at DESC);
