#!/usr/bin/env node

require('dotenv').config();
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function backfill() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS repository_access (
        user_id UUID NOT NULL,
        repository_id UUID NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'admin',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, repository_id)
      )
    `);

    const ownerInsert = await client.query(`
      INSERT INTO repository_access (user_id, repository_id, role)
      SELECT owner_id, id, 'admin'
      FROM repositories
      WHERE owner_id IS NOT NULL
      ON CONFLICT (user_id, repository_id)
      DO UPDATE SET updated_at = NOW()
      RETURNING repository_id
    `);

    const legacyInsert = await client.query(`
      INSERT INTO repository_access (user_id, repository_id, role)
      SELECT user_id, id, 'admin'
      FROM repositories
      WHERE user_id IS NOT NULL
      ON CONFLICT (user_id, repository_id)
      DO UPDATE SET updated_at = NOW()
      RETURNING repository_id
    `);

    await client.query('COMMIT');

    console.log(`repository_access backfill complete`);
    console.log(`owner_id rows processed: ${ownerInsert.rowCount}`);
    console.log(`legacy user_id rows processed: ${legacyInsert.rowCount}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Backfill failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

backfill();
