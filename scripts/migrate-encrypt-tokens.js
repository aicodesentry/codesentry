#!/usr/bin/env node
/**
 * One-time migration: encrypt plain-text GitHub tokens in the users table.
 * Run: ENCRYPTION_KEY=<key> DATABASE_URL=<url> node scripts/migrate-encrypt-tokens.js
 */
const { Pool } = require('pg');
const { encrypt, isEncrypted } = require('../services/api-service/src/utils/encryption');

if (!process.env.ENCRYPTION_KEY) {
  console.error('ENCRYPTION_KEY is required');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function migrate() {
  const users = await pool.query('SELECT id, github_username, github_token FROM users WHERE github_token IS NOT NULL');
  let encrypted = 0;
  let skipped = 0;

  for (const user of users.rows) {
    if (isEncrypted(user.github_token)) {
      skipped++;
      continue;
    }

    const encryptedToken = encrypt(user.github_token);
    await pool.query('UPDATE users SET github_token = $1 WHERE id = $2', [encryptedToken, user.id]);
    encrypted++;
    console.log(`Encrypted token for ${user.github_username}`);
  }

  console.log(`Done. Encrypted: ${encrypted}, Already encrypted: ${skipped}`);
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
