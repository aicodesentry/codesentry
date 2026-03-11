const { Pool } = require('pg');

const isProduction = process.env.NODE_ENV === 'production';
const isLocalDocker = process.env.DATABASE_URL?.includes('postgres:5432');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction && !isLocalDocker ? { rejectUnauthorized: true } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
});

pool.on('error', (err) => {
  console.error(JSON.stringify({ level: 'error', msg: 'DB pool error', error: err.message }));
});

// Test connection on startup
pool.connect()
  .then(client => { client.release(); console.log(JSON.stringify({ level: 'info', msg: 'Database connected' })); })
  .catch(err => console.error(JSON.stringify({ level: 'error', msg: 'DB connect failed', error: err.message })));

/**
 * Execute a parameterized query.
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 */
async function query(text, params) {
  return pool.query(text, params);
}

/**
 * Execute multiple queries in a transaction.
 * @param {Function} fn - async function(client) that executes queries
 */
async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, transaction };
