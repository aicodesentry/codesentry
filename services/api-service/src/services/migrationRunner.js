const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { pool } = require('../config/database');

const MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations');

function listMigrationFiles(migrationsDir = MIGRATIONS_DIR) {
  if (!fs.existsSync(migrationsDir)) {
    return [];
  }

  return fs.readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((file) => ({
      name: file,
      fullPath: path.join(migrationsDir, file),
    }));
}

function readMigration(file) {
  return fs.readFileSync(file.fullPath, 'utf8');
}

function calculateChecksum(sql) {
  return crypto.createHash('sha256').update(sql).digest('hex');
}

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      checksum VARCHAR(64) NOT NULL,
      applied_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
}

async function getAppliedMigrations(client) {
  const result = await client.query('SELECT version, checksum FROM schema_migrations');
  return new Map(result.rows.map((row) => [row.version, row.checksum]));
}

async function planMigrations(client, migrationsDir = MIGRATIONS_DIR) {
  await ensureMigrationsTable(client);
  const files = listMigrationFiles(migrationsDir);
  const applied = await getAppliedMigrations(client);

  const pending = [];
  for (const file of files) {
    const sql = readMigration(file);
    const checksum = calculateChecksum(sql);
    const appliedChecksum = applied.get(file.name);

    if (appliedChecksum && appliedChecksum !== checksum) {
      throw new Error(`Migration checksum mismatch for ${file.name}`);
    }

    if (!appliedChecksum) {
      pending.push({ ...file, sql, checksum });
    }
  }

  return pending;
}

async function getPendingMigrations(migrationsDir = MIGRATIONS_DIR) {
  const client = await pool.connect();
  try {
    return await planMigrations(client, migrationsDir);
  } finally {
    client.release();
  }
}

async function applyMigrations(migrationsDir = MIGRATIONS_DIR) {
  const client = await pool.connect();
  const applied = [];

  try {
    const pending = await planMigrations(client, migrationsDir);

    for (const migration of pending) {
      await client.query('BEGIN');
      try {
        await client.query(migration.sql);
        await client.query(
          'INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)',
          [migration.name, migration.checksum]
        );
        await client.query('COMMIT');
        applied.push(migration.name);
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Failed to apply migration ${migration.name}: ${error.message}`);
      }
    }

    return applied;
  } finally {
    client.release();
  }
}

module.exports = {
  MIGRATIONS_DIR,
  applyMigrations,
  calculateChecksum,
  getPendingMigrations,
  listMigrationFiles,
  planMigrations,
};
