SELECT
  conname,
  convalidated
FROM pg_constraint
WHERE conname IN (
  'user_installations_user_id_fkey',
  'user_installations_installation_id_fkey',
  'repositories_installation_id_fkey',
  'repository_access_user_id_fkey',
  'repository_access_repository_id_fkey',
  'pull_requests_repository_id_fkey',
  'analysis_runs_repository_id_fkey',
  'findings_repository_id_fkey',
  'suppressions_finding_id_fkey',
  'suppressions_repository_id_fkey'
)
ORDER BY conname;

SELECT COUNT(*) AS orphan_repository_access_users
FROM repository_access ra
LEFT JOIN users u ON u.id = ra.user_id
WHERE u.id IS NULL;

SELECT COUNT(*) AS orphan_repository_access_repositories
FROM repository_access ra
LEFT JOIN repositories r ON r.id = ra.repository_id
WHERE r.id IS NULL;

SELECT COUNT(*) AS orphan_pull_requests
FROM pull_requests pr
LEFT JOIN repositories r ON r.id = pr.repository_id
WHERE pr.repository_id IS NOT NULL
  AND r.id IS NULL;

SELECT COUNT(*) AS orphan_analysis_runs
FROM analysis_runs ar
LEFT JOIN repositories r ON r.id = ar.repository_id
WHERE ar.repository_id IS NOT NULL
  AND r.id IS NULL;

SELECT COUNT(*) AS orphan_findings_repositories
FROM findings f
LEFT JOIN repositories r ON r.id = f.repository_id
WHERE f.repository_id IS NOT NULL
  AND r.id IS NULL;

SELECT COUNT(*) AS orphan_findings_pull_requests
FROM findings f
LEFT JOIN pull_requests pr ON pr.id = f.pull_request_id
WHERE f.pull_request_id IS NOT NULL
  AND pr.id IS NULL;
