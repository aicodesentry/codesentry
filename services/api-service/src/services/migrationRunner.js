const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { pool } = require('../config/database');

const MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations');
const MIGRATION_LOCK_KEY = 727274;

function listMigrationFiles(migrationsDir = MIGRATIONS_DIR) {
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(
      `Migrations directory not found: ${migrationsDir}. `
      + 'The deployment artifact is missing the migrations/ folder; refusing to treat this as "no pending migrations".'
    );
  }

  const files = fs.readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((file) => ({
      name: file,
      fullPath: path.join(migrationsDir, file),
    }));

  if (files.length === 0) {
    throw new Error(
      `No SQL migration files found in migrations directory: ${migrationsDir}. `
      + 'The deployment artifact is missing the migrations/ folder; refusing to treat this as "no pending migrations".'
    );
  }

  return files;
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
  let lockAcquired = false;

  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_KEY]);
    lockAcquired = true;
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
    if (lockAcquired) {
      await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_KEY]);
    }
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
