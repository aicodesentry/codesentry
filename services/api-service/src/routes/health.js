const express = require('express');
const { pool } = require('../config/database');

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    await pool.query('SELECT 1');

    res.json({
      status: 'ok',
      service: 'mitig8it-api',
      checks: {
        postgres: 'ok',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      service: 'mitig8it-api',
      error: error.message,
    });
  }
});

module.exports = router;
