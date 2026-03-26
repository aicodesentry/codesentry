#!/usr/bin/env node

/**
 * Test all database connections
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const redis = require('redis');
const { Pool } = require('pg');

// Colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

async function testPostgreSQL() {
  log(colors.blue, '\n🔍 Testing PostgreSQL connection...');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    log(colors.green, '✓ Connected to PostgreSQL');

    // Test query
    const result = await client.query('SELECT NOW()');
    log(colors.blue, `  Server time: ${result.rows[0].now}`);

    // Check tables
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
    log(colors.red, `✗ PostgreSQL error: ${error.message}`);
    return false;
  }
}

async function testMongoDB() {
  log(colors.blue, '\n🔍 Testing MongoDB connection...');

  const client = new MongoClient(process.env.MONGODB_URL);

  try {
    await client.connect();
    log(colors.green, '✓ Connected to MongoDB');

    const db = client.db(process.env.MONGODB_DB_NAME || 'analysis_results');

    // List collections
    const collections = await db.listCollections().toArray();
    log(colors.blue, `  Collections: ${collections.length}`);
    collections.forEach(col => {
      log(colors.blue, `    - ${col.name}`);
    });

    // Test insert and read
    const testCol = db.collection('health_check');
    const testDoc = { timestamp: new Date(), test: true };
    await testCol.insertOne(testDoc);
    const found = await testCol.findOne({ test: true });

    if (found) {
      log(colors.green, '✓ MongoDB read/write working');
      await testCol.deleteOne({ _id: found._id });
    }

    await client.close();
    return true;
  } catch (error) {
    log(colors.red, `✗ MongoDB error: ${error.message}`);
    return false;
  }
}

async function testRedis() {
  log(colors.blue, '\n🔍 Testing Redis connection...');

  const client = redis.createClient({
    url: process.env.REDIS_URL
  });

  client.on('error', (err) => {
    log(colors.red, `✗ Redis error: ${err.message}`);
  });

  try {
    await client.connect();
    log(colors.green, '✓ Connected to Redis');

    // Test set/get
    await client.set('test_key', 'test_value', { EX: 10 });
    const value = await client.get('test_key');

    if (value === 'test_value') {
      log(colors.green, '✓ Redis read/write working');
    }

    // Get info
    const info = await client.info('server');
    const version = info.match(/redis_version:([^\r\n]+)/)?.[1];
    log(colors.blue, `  Redis version: ${version}`);

    await client.del('test_key');
    await client.disconnect();

    return true;
  } catch (error) {
    log(colors.red, `✗ Redis error: ${error.message}`);
    return false;
  }
}

async function main() {
  log(colors.blue, '========================================');
  log(colors.blue, 'Database Connection Tests');
  log(colors.blue, '========================================');

  const results = {
    postgresql: await testPostgreSQL(),
    mongodb: await testMongoDB(),
    redis: await testRedis()
  };

  // Summary
  log(colors.blue, '\n========================================');
  log(colors.blue, 'Summary');
  log(colors.blue, '========================================');

  const total = Object.keys(results).length;
  const healthy = Object.values(results).filter(r => r).length;

  log(colors.blue, `Total Databases: ${total}`);
  log(colors.green, `Connected: ${healthy}`);
  log(colors.red, `Failed: ${total - healthy}`);

  Object.entries(results).forEach(([db, status]) => {
    const color = status ? colors.green : colors.red;
    const icon = status ? '✓' : '✗';
    log(color, `${icon} ${db}`);
  });

  if (healthy === total) {
    log(colors.green, '\n✓ All databases are connected and working');
    process.exit(0);
  } else {
    log(colors.red, '\n✗ Some database connections failed');
    process.exit(1);
  }
}

main().catch((error) => {
  log(colors.red, `Fatal error: ${error.message}`);
  process.exit(1);
});
