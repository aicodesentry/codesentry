const { pool } = require('../config/database');

function normalizeAccount(value) {
  return (value || '').trim().toLowerCase();
}

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
  const db = client || pool;
  return db.query(
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
  const db = client || pool;
  return db.query(
    `INSERT INTO user_installations (user_id, installation_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, installation_id)
     DO UPDATE SET updated_at = NOW()`,
    [userId, installationId]
  );
}

async function removeSameAccountStaleLinks(client, userId, installation) {
  const db = client || pool;
  const accountLogin = normalizeAccount(installation.account?.login);
  const accountType = normalizeAccount(installation.account?.type);

  if (!accountLogin) return;

  return db.query(
    `DELETE FROM user_installations ui
     USING installations i
     WHERE ui.user_id = $1
       AND ui.installation_id = i.id
       AND LOWER(COALESCE(i.account_login, '')) = $2
       AND LOWER(COALESCE(i.account_type, '')) = $3
       AND i.id <> $4`,
    [userId, accountLogin, accountType, installation.id]
  );
}

async function reconcileUserInstallations(client, userId, activeInstallationIds) {
  const db = client || pool;
  const installationIds = (activeInstallationIds || []).filter(Boolean);

  if (installationIds.length > 0) {
    await db.query(
      `DELETE FROM user_installations
       WHERE user_id = $1
         AND installation_id <> ALL($2::bigint[])`,
      [userId, installationIds]
    );

    await db.query(
      `UPDATE installations i
       SET status = 'inactive', updated_at = NOW()
       WHERE i.id <> ALL($2::bigint[])
         AND EXISTS (
           SELECT 1
           FROM user_installations ui
           WHERE ui.user_id = $1
             AND ui.installation_id = i.id
         )`,
      [userId, installationIds]
    );

    return;
  }

  await db.query('DELETE FROM user_installations WHERE user_id = $1', [userId]);
}

async function deleteUnreferencedInstallations(client) {
  const db = client || pool;
  return db.query(
    `DELETE FROM installations i
     WHERE NOT EXISTS (
       SELECT 1 FROM user_installations ui WHERE ui.installation_id = i.id
     )
       AND NOT EXISTS (
         SELECT 1 FROM repositories r WHERE r.installation_id = i.id
       )`
  );
}

module.exports = {
  deleteUnreferencedInstallations,
  linkUserInstallation,
  listByUser,
  reconcileUserInstallations,
  removeSameAccountStaleLinks,
  upsertInstallation,
};
