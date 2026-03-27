SELECT
  COUNT(*) AS plaintext_token_rows
FROM users
WHERE github_token IS NOT NULL
  AND github_token NOT LIKE '%:%:%';

SELECT
  COUNT(*) AS shared_installations
FROM (
  SELECT installation_id
  FROM user_installations
  GROUP BY installation_id
  HAVING COUNT(DISTINCT user_id) > 1
) shared;

SELECT
  COUNT(*) AS repositories_without_access
FROM repositories r
LEFT JOIN repository_access ra ON ra.repository_id = r.id
WHERE ra.repository_id IS NULL;

SELECT
  COUNT(*) AS cross_repo_duplicate_fingerprints
FROM (
  SELECT fingerprint
  FROM findings
  GROUP BY fingerprint
  HAVING COUNT(DISTINCT repository_id) > 1
) duplicates;

SELECT
  COUNT(*) AS audit_logs_table_exists
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'audit_logs';

SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'findings'
  AND indexname = 'idx_findings_repo_pr_fingerprint';
