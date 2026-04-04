const { pool } = require('../config/database');

async function listByUser(userId) {
  const result = await pool.query(
    `SELECT
       i.id,
       i.account_login,
       i.account_type,
       i.status,
       i.updated_at,
       COUNT(DISTINCT r.id) FILTER (WHERE r.is_active = true) AS repository_count
     FROM installations i
     JOIN user_installations ui ON ui.installation_id = i.id
     LEFT JOIN repositories r ON r.installation_id = i.id
     LEFT JOIN repository_access ra ON ra.repository_id = r.id AND ra.user_id = $1
     WHERE ui.user_id = $1
       AND (r.id IS NULL OR ra.user_id = $1)
     GROUP BY i.id
     ORDER BY i.updated_at DESC`,
    [userId]
  );

  return result.rows;
}

async function upsertInstallation(client, installation, status = 'active') {
  const dbClient = client || pool;

  return dbClient.query(
    `INSERT INTO installations (id, account_login, account_type, target_type, html_url, permissions, events, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id)
     DO UPDATE SET
       account_login = EXCLUDED.account_login,
       account_type = EXCLUDED.account_type,
       target_type = EXCLUDED.target_type,
       html_url = EXCLUDED.html_url,
       permissions = EXCLUDED.permissions,
       events = EXCLUDED.events,
       status = EXCLUDED.status,
       updated_at = NOW()`,
    [
      installation.id,
      installation.account?.login,
      installation.account?.type,
      installation.target_type,
      installation.html_url,
      JSON.stringify(installation.permissions || {}),
      installation.events || [],
      status,
    ]
  );
}

async function linkUserInstallation(client, userId, installationId) {
  const dbClient = client || pool;

  return dbClient.query(
    `INSERT INTO user_installations (user_id, installation_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, installation_id)
     DO UPDATE SET updated_at = NOW()`,
    [userId, installationId]
  );
}

async function reconcileUserInstallations(client, userId, activeInstallationIds) {
  const dbClient = client || pool;
  if (!activeInstallationIds.length) return;

  return dbClient.query(
    `DELETE FROM user_installations
     WHERE user_id = $1
       AND installation_id != ALL($2::bigint[])`,
    [userId, activeInstallationIds]
  );
}

async function deleteUnreferencedInstallations(client) {
  const dbClient = client || pool;

  return dbClient.query(
    `DELETE FROM installations
     WHERE id NOT IN (SELECT DISTINCT installation_id FROM user_installations)`
  );
}

async function removeSameAccountStaleLinks(client, userId, installation) {
  const dbClient = client || pool;

  return dbClient.query(
    `DELETE FROM user_installations
     WHERE user_id = $1
       AND installation_id != $2
       AND installation_id IN (
         SELECT id FROM installations
         WHERE account_login = $3 AND account_type = $4
       )`,
    [userId, installation.id, installation.account?.login, installation.account?.type]
  );
}

module.exports = {
  listByUser,
  upsertInstallation,
  linkUserInstallation,
  removeSameAccountStaleLinks,
  reconcileUserInstallations,
  deleteUnreferencedInstallations,
};
