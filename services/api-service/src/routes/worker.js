const express = require('express');
const { transaction } = require('../config/database');

const router = express.Router();

function verifyWorkerSecret(req, res, next) {
  const token = req.headers['x-worker-secret'];
  if (!token || token !== process.env.WORKER_CALLBACK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized worker callback' });
  }
  return next();
}

router.post('/analysis-runs/:id/complete', verifyWorkerSecret, async (req, res) => {
  const runId = req.params.id;
  const {
    status,
    findings_count = 0,
    critical_count = 0,
    high_count = 0,
    medium_count = 0,
    low_count = 0,
    files_analyzed = 0,
    error_message = null,
    github_check_run_id = null,
    summary_comment_id = null,
  } = req.body;

  const allowed = ['completed', 'failed'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const updated = await transaction(async (client) => {
    const run = await client.query('SELECT id, repository_id FROM analysis_runs WHERE id = $1', [runId]);
    if (run.rowCount === 0) return null;

    const updateResult = await client.query(
      `UPDATE analysis_runs
       SET status = $1,
           findings_count = $2,
           critical_count = $3,
           high_count = $4,
           medium_count = $5,
           low_count = $6,
           files_analyzed = $7,
           error_message = $8,
           github_check_run_id = COALESCE($9, github_check_run_id),
           summary_comment_id = COALESCE($10, summary_comment_id),
           completed_at = NOW()
       WHERE id = $11
       RETURNING *`,
      [
        status,
        findings_count,
        critical_count,
        high_count,
        medium_count,
        low_count,
        files_analyzed,
        error_message,
        github_check_run_id,
        summary_comment_id,
        runId,
      ]
    );

    await client.query(
      `INSERT INTO audit_logs (repository_id, action, resource_type, resource_id, details)
       VALUES ($1, 'analysis.run.completed', 'analysis_run', $2, $3)`,
      [
        run.rows[0].repository_id,
        runId,
        JSON.stringify({
          status,
          findings_count,
          critical_count,
          high_count,
          medium_count,
          low_count,
        }),
      ]
    );

    return updateResult.rows[0];
  });

  if (!updated) {
    return res.status(404).json({ error: 'Analysis run not found' });
  }

  res.json({ success: true, run: updated });
});

module.exports = router;
