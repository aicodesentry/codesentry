jest.mock('../src/config/database', () => ({
  pool: {
    query: jest.fn(),
  },
}));

const { pool } = require('../src/config/database');
const analysisRuns = require('../src/db/analysisRuns');

describe('analysis run queue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('claims the next pending or stale running analysis with a row lock', async () => {
    const queuedRun = {
      analysis_run_id: 'run-1',
      repository_id: 'repo-1',
      repository_github_id: 123,
      repository_full_name: 'acme/app',
      installation_id: 456,
      pull_request_id: 'pr-1',
      pull_request_number: 7,
      commit_sha: 'abc123',
      baseline_set: false,
    };
    pool.query.mockResolvedValueOnce({ rows: [queuedRun] });

    const result = await analysisRuns.claimNextQueuedRun(10);

    expect(result).toEqual(queuedRun);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('FOR UPDATE OF candidate SKIP LOCKED'),
      [10]
    );
    expect(pool.query.mock.calls[0][0]).toContain("candidate.status = 'pending'");
    expect(pool.query.mock.calls[0][0]).toContain("candidate.status = 'running'");
    expect(pool.query.mock.calls[0][0]).toContain("$1::int * INTERVAL '1 minute'");
    expect(pool.query.mock.calls[0][0]).toContain("SET status = 'running'");
  });

  test('falls back to the default stale threshold for invalid input', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    await analysisRuns.claimNextQueuedRun('abc');

    expect(pool.query).toHaveBeenCalledWith(expect.any(String), [20]);
  });

  test('returns null when no queued analysis is available', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    await expect(analysisRuns.claimNextQueuedRun()).resolves.toBeNull();
  });

  test('returns normalized queue stats', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{
        pending: '3',
        running: '1',
        failed: '2',
        oldest_pending_seconds: '90',
      }],
    });

    await expect(analysisRuns.getQueueStats()).resolves.toEqual({
      pending: 3,
      running: 1,
      failed: 2,
      oldest_pending_seconds: 90,
    });
  });
});
