const path = require('path');
require('dotenv').config();
require('dotenv').config({ path: path.resolve(__dirname, '../../../../.env'), override: false });

const { pool } = require('../config/database');
const { getPendingMigrations } = require('../services/migrationRunner');

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const pending = await getPendingMigrations();
  if (pending.length > 0) {
    throw new Error(`Pending database migrations: ${pending.map((migration) => migration.name).join(', ')}`);
  }

  console.log(JSON.stringify({ level: 'info', msg: 'Database migrations are up to date' }));
}

main()
  .catch((error) => {
    console.error(JSON.stringify({ level: 'error', msg: 'Database migration verification failed', error: error.message }));
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
