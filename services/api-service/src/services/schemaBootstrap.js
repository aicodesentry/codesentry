const { query } = require('../config/database');
const logger = require('../utils/logger');

const CREATE_TABLE_STATEMENTS = [
  `CREATE EXTENSION IF NOT EXISTS "pgcrypto";`,
  `CREATE TABLE IF NOT EXISTS installations (
    id BIGINT PRIMARY KEY,
    account_login VARCHAR(255),
    account_type VARCHAR(50),
    target_type VARCHAR(50),
    html_url VARCHAR(500),
    permissions JSONB,
    events TEXT[],
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    installed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    github_id BIGINT UNIQUE NOT NULL,
    github_username VARCHAR(255) NOT NULL,
    github_email VARCHAR(255),
    avatar_url VARCHAR(500),
    name VARCHAR(255),
    github_token TEXT,
    installation_id BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS repositories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    github_id BIGINT UNIQUE NOT NULL,
    installation_id BIGINT,
    owner_id UUID,
    name VARCHAR(255) NOT NULL,
    full_name VARCHAR(500) NOT NULL,
    private BOOLEAN NOT NULL DEFAULT false,
    default_branch VARCHAR(255) NOT NULL DEFAULT 'main',
    language VARCHAR(100),
    html_url VARCHAR(500),
    clone_url VARCHAR(500),
    webhook_id BIGINT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    baseline_set BOOLEAN NOT NULL DEFAULT false,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS pull_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID,
    github_pr_id BIGINT,
    pr_number INTEGER NOT NULL,
    title VARCHAR(1000),
    body TEXT,
    state VARCHAR(50),
    head_sha VARCHAR(40),
    base_sha VARCHAR(40),
    head_branch VARCHAR(255),
    base_branch VARCHAR(255),
    author VARCHAR(255),
    html_url VARCHAR(500),
    draft BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    merged_at TIMESTAMP
  );`,
  `CREATE TABLE IF NOT EXISTS analysis_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID,
    pull_request_id UUID,
    pr_number INTEGER,
    commit_sha VARCHAR(40),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    triggered_by VARCHAR(50),
    files_analyzed INTEGER NOT NULL DEFAULT 0,
    findings_count INTEGER NOT NULL DEFAULT 0,
    critical_count INTEGER NOT NULL DEFAULT 0,
    high_count INTEGER NOT NULL DEFAULT 0,
    medium_count INTEGER NOT NULL DEFAULT 0,
    low_count INTEGER NOT NULL DEFAULT 0,
    github_check_run_id BIGINT,
    summary_comment_id BIGINT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID,
    pr_number INTEGER,
    pr_url VARCHAR(500),
    status VARCHAR(50) NOT NULL DEFAULT 'processing',
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID,
    installation_id BIGINT,
    pull_request_number INTEGER,
    pull_request_id UUID,
    analysis_run_id UUID,
    commit_sha VARCHAR(40),
    fingerprint VARCHAR(64) NOT NULL,
    rule_id VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    cwe_id VARCHAR(20),
    owasp_category VARCHAR(50),
    severity VARCHAR(20) NOT NULL,
    confidence DECIMAL(3,2) NOT NULL DEFAULT 0.5,
    exploitability VARCHAR(20),
    file_path VARCHAR(1000) NOT NULL,
    line_start INTEGER,
    line_end INTEGER,
    code_snippet TEXT,
    evidence TEXT,
    exploit_scenario TEXT,
    remediation TEXT,
    remediation_patch TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'open',
    dismissal_reason TEXT,
    inline_comment_id BIGINT,
    is_baseline BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    first_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMP NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS suppressions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    finding_id UUID,
    repository_id UUID,
    fingerprint VARCHAR(64) NOT NULL,
    reason VARCHAR(50) NOT NULL,
    notes TEXT,
    suppressed_by UUID,
    expires_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_id VARCHAR(255) NOT NULL UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    action VARCHAR(100),
    processing_status VARCHAR(50) NOT NULL DEFAULT 'received',
    error_message TEXT,
    received_at TIMESTAMP NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMP
  );`,
  `CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID,
    event_type VARCHAR(100),
    action VARCHAR(100),
    pr_number INTEGER,
    pr_title VARCHAR(1000),
    pr_url VARCHAR(500),
    branch_name VARCHAR(255),
    sender_username VARCHAR(255),
    payload JSONB,
    received_at TIMESTAMP NOT NULL DEFAULT NOW()
  );`,
];

const ALTER_STATEMENTS = [
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS github_email VARCHAR(255);`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS github_token TEXT;`,
  `ALTER TABLE repositories ADD COLUMN IF NOT EXISTS owner_id UUID;`,
  `ALTER TABLE repositories ADD COLUMN IF NOT EXISTS installation_id BIGINT;`,
  `ALTER TABLE repositories ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;`,
  `ALTER TABLE repositories ADD COLUMN IF NOT EXISTS baseline_set BOOLEAN NOT NULL DEFAULT false;`,
  `ALTER TABLE repositories ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb;`,
  `ALTER TABLE pull_requests ADD COLUMN IF NOT EXISTS repository_id UUID;`,
  `ALTER TABLE pull_requests ADD COLUMN IF NOT EXISTS pr_number INTEGER;`,
  `ALTER TABLE pull_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();`,
  `ALTER TABLE analysis_runs ADD COLUMN IF NOT EXISTS repository_id UUID;`,
  `ALTER TABLE analysis_runs ADD COLUMN IF NOT EXISTS pull_request_id UUID;`,
  `ALTER TABLE analysis_runs ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'pending';`,
  `ALTER TABLE analysis_runs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();`,
  `ALTER TABLE findings ADD COLUMN IF NOT EXISTS repository_id UUID;`,
  `ALTER TABLE findings ADD COLUMN IF NOT EXISTS pull_request_id UUID;`,
  `ALTER TABLE findings ADD COLUMN IF NOT EXISTS analysis_run_id UUID;`,
  `ALTER TABLE findings ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'open';`,
];

async function ensureDatabaseSchema() {
  logger.info('Ensuring API database schema');
  for (const statement of CREATE_TABLE_STATEMENTS) {
    await query(statement);
  }
  for (const statement of ALTER_STATEMENTS) {
    await query(statement);
  }
  logger.info('API database schema is ready');
}

module.exports = { ensureDatabaseSchema };
