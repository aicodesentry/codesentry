const path = require('path');
require('dotenv').config();
require('dotenv').config({ path: path.resolve(__dirname, '../../../../.env'), override: false });

const { pool } = require('../config/database');
const { applyMigrations } = require('../services/migrationRunner');

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const applied = await applyMigrations();
  console.log(JSON.stringify({ level: 'info', msg: 'Database migrations complete', applied }));
}

main()
  .catch((error) => {
    console.error(JSON.stringify({ level: 'error', msg: 'Database migration failed', error: error.message }));
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
