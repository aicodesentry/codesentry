ALTER TABLE users
  ADD COLUMN IF NOT EXISTS github_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS github_token_expires_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS github_refresh_token_expires_at TIMESTAMP;
