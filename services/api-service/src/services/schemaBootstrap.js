const logger = require('../utils/logger');
const { applyMigrations, getPendingMigrations } = require('./migrationRunner');

function shouldAutoMigrate() {
  if (process.env.AUTO_MIGRATE === 'true') return true;
  if (process.env.AUTO_MIGRATE === 'false') return false;
  return process.env.NODE_ENV !== 'production';
}

async function ensureDatabaseSchema() {
  if (shouldAutoMigrate()) {
    const applied = await applyMigrations();
    logger.info('API database migrations applied', { applied: applied.length });
    return;
  }

  const pending = await getPendingMigrations();
  if (pending.length > 0) {
    throw new Error(
      `Pending database migrations: ${pending.map((migration) => migration.name).join(', ')}. Run npm run db:migrate before starting the API service.`
    );
  }

  logger.info('API database schema is up to date');
}

module.exports = { ensureDatabaseSchema, shouldAutoMigrate };
