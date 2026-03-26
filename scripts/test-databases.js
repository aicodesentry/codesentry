#!/usr/bin/env node

/**
 * Test database connections (PostgreSQL + Redis)
 */

require('dotenv').config();
const redis = require('redis');
const { Pool } = require('pg');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

async function testPostgreSQL() {
  log(colors.blue, '\nTesting PostgreSQL connection...');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    log(colors.green, '  Connected to PostgreSQL');

    const result = await client.query('SELECT NOW()');
    log(colors.blue, `  Server time: ${result.rows[0].now}`);

    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);

    log(colors.blue, `  Tables: ${tables.rows.length}`);
    tables.rows.forEach(row => {
      log(colors.blue, `    - ${row.table_name}`);
    });

    client.release();
    await pool.end();
    return true;
  } catch (error) {
    log(colors.red, `  PostgreSQL error: ${error.message}`);
    return false;
  }
}

async function testRedis() {
  log(colors.blue, '\nTesting Redis connection...');

  const client = redis.createClient({
    url: process.env.REDIS_URL
  });

  client.on('error', (err) => {
    log(colors.red, `  Redis error: ${err.message}`);
  });

  try {
    await client.connect();
    log(colors.green, '  Connected to Redis');

    await client.set('test_key', 'test_value', { EX: 10 });
    const value = await client.get('test_key');

    if (value === 'test_value') {
      log(colors.green, '  Redis read/write working');
    }

    const info = await client.info('server');
    const version = info.match(/redis_version:([^\r\n]+)/)?.[1];
    log(colors.blue, `  Redis version: ${version}`);

    await client.del('test_key');
    await client.disconnect();
    return true;
  } catch (error) {
    log(colors.red, `  Redis error: ${error.message}`);
    return false;
  }
}

async function main() {
  log(colors.blue, '========================================');
  log(colors.blue, 'Database Connection Tests');
  log(colors.blue, '========================================');

  const results = {
    postgresql: await testPostgreSQL(),
    redis: await testRedis()
  };

  log(colors.blue, '\n========================================');
  log(colors.blue, 'Summary');
  log(colors.blue, '========================================');

  const total = Object.keys(results).length;
  const healthy = Object.values(results).filter(r => r).length;

  Object.entries(results).forEach(([db, status]) => {
    const color = status ? colors.green : colors.red;
    const icon = status ? 'OK' : 'FAIL';
    log(color, `  ${icon} ${db}`);
  });

  if (healthy === total) {
    log(colors.green, '\nAll databases connected.');
    process.exit(0);
  } else {
    log(colors.red, `\n${total - healthy} connection(s) failed.`);
    process.exit(1);
  }
}

main().catch((error) => {
  log(colors.red, `Fatal error: ${error.message}`);
  process.exit(1);
});
