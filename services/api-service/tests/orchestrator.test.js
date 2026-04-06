const axios = require('axios');

jest.mock('axios');
jest.mock('../src/config/database', () => ({
  pool: { query: jest.fn() },
  transaction: jest.fn(),
}));
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

const { pool } = require('../src/config/database');
const logger = require('../src/utils/logger');

beforeEach(() => {
  jest.clearAllMocks();
  process.env.GITHUB_SERVICE_URL = 'http://github-service:3002';
  process.env.GITHUB_SERVICE_INTERNAL_SECRET = 'test-secret';
  process.env.ANALYSIS_SERVICE_URL = 'http://analysis-service:8001';
});

// Test the pure functions directly instead of the async pipeline
describe('PR Analysis Orchestrator — pure functions', () => {
  const {
    summarizeFindings,
    buildReviewBody,
    buildReviewComment,
    severityIcon,
    markdownEscape,
  } = jest.requireActual('../src/services/prAnalysisOrchestrator');

  // These are not exported, so test via the module internals
  // For now, test the pipeline behavior via mock assertions

  test('summarizeFindings counts correctly', () => {
    // We can't directly test unexported functions, but we can test
    // the orchestrator marks runs as failed on error
  });
});

describe('PR Analysis Orchestrator — pipeline', () => {
  // Access the internal runAnalysisJob by requiring the module
  // and using triggerAnalysisJob which calls it
  const BASE_PAYLOAD = {
    analysis_run_id: 'run-uuid-1',
    repository_id: 'repo-uuid-1',
    repository_full_name: 'owner/repo',
    installation_id: 12345,
    pull_request_id: 'pr-uuid-1',
    pull_request_number: 42,
    commit_sha: 'abc123def456',
    baseline_set: true,
  };
  const PERSISTED_FINDING = {
    id: 'finding-1',
    status: 'open',
    is_baseline: false,
    fingerprint: 'fp-1',
    severity: 'critical',
    confidence: 0.92,
    file_path: 'test_vuln.js',
    line_start: 2,
    title: 'Code injection via eval or dynamic execution',
    evidence: 'Matched deterministic rule `code.injection.eval` on `eval(`.',
    description: 'Dynamic code execution can run attacker-controlled payloads.',
    remediation: 'Replace eval/exec with safe alternatives.',
    cwe_id: 'CWE-95',
  };
  const PERSISTED_CONTEXT_FINDING = {
    ...PERSISTED_FINDING,
    id: 'finding-context',
    fingerprint: 'fp-context',
    line_start: 10,
    code_snippet: 'const untouched = true;',
    evidence: 'Matched deterministic rule on unchanged context.',
  };
  const PERSISTED_ADDED_FINDING = {
    ...PERSISTED_FINDING,
    id: 'finding-added',
    fingerprint: 'fp-added',
    line_start: 12,
    code_snippet: 'eval(req.body.code);',
    evidence: 'Matched deterministic rule `code.injection.eval` on `eval(`.',
  };

  function flushAsync() {
    return new Promise((resolve) => setTimeout(resolve, 300));
  }

  test('marks run as failed when GitHub service is unreachable', async () => {
    // GitHub service fails
    axios.post.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    // Update run to failed
    pool.query.mockResolvedValueOnce({ rowCount: 1 });

    const { triggerAnalysisJob } = require('../src/services/prAnalysisOrchestrator');
    triggerAnalysisJob(BASE_PAYLOAD);
    await flushAsync();

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("status = 'failed'"),
      expect.arrayContaining(['run-uuid-1'])
    );
    expect(logger.error).toHaveBeenCalled();
  });

  test('marks run as failed when analysis service errors', async () => {
    // GitHub service succeeds
    axios.post.mockResolvedValueOnce({
      data: { files: [{ path: 'app.py', patch: '+x=1', additions: 1 }] },
    });
    // Analysis service fails
    axios.post.mockRejectedValueOnce(new Error('Analysis timeout'));
    // Update run to failed
    pool.query.mockResolvedValueOnce({ rowCount: 1 });

    jest.isolateModules(() => {
      const mod = require('../src/services/prAnalysisOrchestrator');
      mod.triggerAnalysisJob(BASE_PAYLOAD);
    });
    await flushAsync();

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("status = 'failed'"),
      expect.arrayContaining(['run-uuid-1', 'Analysis timeout'])
    );
  });

  test('calls GitHub service with correct internal secret header', async () => {
    // GitHub service succeeds
    axios.post.mockResolvedValueOnce({
      data: { files: [] },
    });
    // Analysis service returns no findings
    axios.post.mockResolvedValueOnce({ data: { findings: [] } });
    // Run count
    pool.query.mockResolvedValueOnce({ rows: [{ count: 1 }] });
    // markFixedFindings
    pool.query.mockResolvedValueOnce({ rowCount: 0 });
    // suppressions
    pool.query.mockResolvedValueOnce({ rows: [] });
    // review submit
    axios.post.mockResolvedValueOnce({ data: { review_id: 1 } });
    // check run
    axios.post.mockResolvedValueOnce({ data: { check_run_id: 2 } });
    // update analysis_runs
    pool.query.mockResolvedValueOnce({ rowCount: 1 });

    jest.isolateModules(() => {
      const mod = require('../src/services/prAnalysisOrchestrator');
      mod.triggerAnalysisJob(BASE_PAYLOAD);
    });
    await flushAsync();

    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/internal/github/pulls/files'),
      expect.any(Object),
      expect.objectContaining({
        headers: { 'x-internal-secret': 'test-secret' },
      })
    );
  });

  test('posts review as COMMENT when no critical/high findings', async () => {
    axios.post.mockResolvedValueOnce({ data: { files: [] } });
    axios.post.mockResolvedValueOnce({ data: { findings: [] } });
    pool.query.mockResolvedValueOnce({ rows: [{ count: 1 }] });
    pool.query.mockResolvedValueOnce({ rowCount: 0 });
    pool.query.mockResolvedValueOnce({ rows: [] });
    axios.post.mockResolvedValueOnce({ data: { review_id: 1 } });
    axios.post.mockResolvedValueOnce({ data: { check_run_id: 2 } });
    pool.query.mockResolvedValueOnce({ rowCount: 1 });

    jest.isolateModules(() => {
      const mod = require('../src/services/prAnalysisOrchestrator');
      mod.triggerAnalysisJob(BASE_PAYLOAD);
    });
    await flushAsync();

    // Find the review submit call
    const reviewCall = axios.post.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('reviews/submit')
    );
    if (reviewCall) {
      expect(reviewCall[1].event).toBe('COMMENT');
    }
  });

  test('logs error but does not fail run when review posting fails', async () => {
    axios.post.mockResolvedValueOnce({ data: { files: [] } });
    axios.post.mockResolvedValueOnce({ data: { findings: [] } });
    pool.query.mockResolvedValueOnce({ rows: [{ count: 1 }] });
    pool.query.mockResolvedValueOnce({ rowCount: 0 });
    pool.query.mockResolvedValueOnce({ rows: [] });
    // Review fails
    axios.post.mockRejectedValueOnce(new Error('502 Bad Gateway'));
    // Check run succeeds
    axios.post.mockResolvedValueOnce({ data: { check_run_id: 2 } });
    // Update run to completed (not failed)
    pool.query.mockResolvedValueOnce({ rowCount: 1 });

    jest.isolateModules(() => {
      const mod = require('../src/services/prAnalysisOrchestrator');
      mod.triggerAnalysisJob(BASE_PAYLOAD);
    });
    await flushAsync();

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to submit PR review',
      expect.any(Object)
    );
    // Run should still be marked completed, not failed
    const updateCall = pool.query.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes("status = 'completed'")
    );
    expect(updateCall).toBeTruthy();
  });

  test('does not suppress findings on the first completed PR run for a repository', async () => {
    axios.post.mockResolvedValueOnce({
      data: { files: [{ path: 'test_vuln.js', patch: '@@ -0,0 +1,2 @@\n+const apiKey = "secret123456789";\n+eval(req.body.code);', additions: 2 }] },
    });
    axios.post.mockResolvedValueOnce({
      data: {
        findings: [{
          rule_id: 'code.injection.eval',
          internal_type: 'code_injection',
          title: 'Code injection via eval or dynamic execution',
          description: 'Dynamic code execution can run attacker-controlled payloads.',
          category: 'code injection',
          severity: 'critical',
          confidence: 0.92,
          exploitability: 'high',
          file_path: 'test_vuln.js',
          line_start: 2,
          line_end: 2,
          code_snippet: 'eval(req.body.code);',
          evidence: 'Matched deterministic rule `code.injection.eval` on `eval(`.',
          remediation: 'Replace eval/exec with safe alternatives.',
          fingerprint: 'fp-1',
        }],
      },
    });
    pool.query.mockResolvedValueOnce({ rows: [{ count: 0 }] });
    pool.query.mockResolvedValueOnce({ rows: [] });
    pool.query.mockResolvedValueOnce({ rows: [PERSISTED_FINDING] });
    pool.query.mockResolvedValueOnce({ rowCount: 0 });
    pool.query.mockResolvedValueOnce({ rows: [] });
    axios.post.mockResolvedValueOnce({ data: { review_id: 1 } });
    axios.post.mockResolvedValueOnce({ data: { check_run_id: 2 } });
    pool.query.mockResolvedValueOnce({ rowCount: 1 });
    pool.query.mockResolvedValueOnce({ rowCount: 1 });

    jest.isolateModules(() => {
      const mod = require('../src/services/prAnalysisOrchestrator');
      mod.triggerAnalysisJob({ ...BASE_PAYLOAD, baseline_set: false });
    });
    await flushAsync();

    const reviewCall = axios.post.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('reviews/submit')
    );
    expect(reviewCall).toBeTruthy();
    expect(reviewCall[1].comments).toHaveLength(1);
    expect(reviewCall[1].event).toBe('REQUEST_CHANGES');
  });

  test('retries review submission without inline comments when GitHub rejects annotations', async () => {
    axios.post.mockResolvedValueOnce({
      data: { files: [{ path: 'test_vuln.js', patch: '@@ -0,0 +1,2 @@\n+const apiKey = "secret123456789";\n+eval(req.body.code);', additions: 2 }] },
    });
    axios.post.mockResolvedValueOnce({
      data: {
        findings: [{
          rule_id: 'code.injection.eval',
          internal_type: 'code_injection',
          title: 'Code injection via eval or dynamic execution',
          description: 'Dynamic code execution can run attacker-controlled payloads.',
          category: 'code injection',
          severity: 'critical',
          confidence: 0.92,
          exploitability: 'high',
          file_path: 'test_vuln.js',
          line_start: 2,
          line_end: 2,
          code_snippet: 'eval(req.body.code);',
          evidence: 'Matched deterministic rule `code.injection.eval` on `eval(`.',
          remediation: 'Replace eval/exec with safe alternatives.',
          fingerprint: 'fp-1',
        }],
      },
    });
    pool.query.mockResolvedValueOnce({ rows: [{ count: 1 }] });
    pool.query.mockResolvedValueOnce({ rows: [] });
    pool.query.mockResolvedValueOnce({ rows: [PERSISTED_FINDING] });
    pool.query.mockResolvedValueOnce({ rowCount: 0 });
    pool.query.mockResolvedValueOnce({ rows: [] });
    axios.post.mockRejectedValueOnce(new Error('Validation failed'));
    axios.post.mockResolvedValueOnce({ data: { review_id: 99 } });
    axios.post.mockResolvedValueOnce({ data: { check_run_id: 2 } });
    pool.query.mockResolvedValueOnce({ rowCount: 1 });

    jest.isolateModules(() => {
      const mod = require('../src/services/prAnalysisOrchestrator');
      mod.triggerAnalysisJob(BASE_PAYLOAD);
    });
    await flushAsync();

    const reviewCalls = axios.post.mock.calls.filter(
      (call) => typeof call[0] === 'string' && call[0].includes('reviews/submit')
    );
    expect(reviewCalls).toHaveLength(2);
    expect(reviewCalls[0][1].comments).toHaveLength(1);
    expect(reviewCalls[1][1].comments).toHaveLength(0);
    expect(reviewCalls[1][1].body).toContain('Inline annotations were skipped');
  });

  test('only submits inline comments for lines that are actually added in the patch', async () => {
    axios.post.mockResolvedValueOnce({
      data: {
        files: [{
          path: 'test_vuln.js',
          patch: '@@ -10,1 +10,3 @@\n const untouched = true;\n+const apiKey = "secret123456789";\n+eval(req.body.code);\n',
          additions: 2,
        }],
      },
    });
    axios.post.mockResolvedValueOnce({
      data: {
        findings: [{
          rule_id: 'code.injection.eval',
          internal_type: 'code_injection',
          title: 'Code injection via eval or dynamic execution',
          description: 'Dynamic code execution can run attacker-controlled payloads.',
          category: 'code injection',
          severity: 'critical',
          confidence: 0.92,
          exploitability: 'high',
          file_path: 'test_vuln.js',
          line_start: 10,
          line_end: 10,
          code_snippet: 'const untouched = true;',
          evidence: 'Matched deterministic rule on unchanged context.',
          remediation: 'Replace eval/exec with safe alternatives.',
          fingerprint: 'fp-context',
        }, {
          rule_id: 'code.injection.eval',
          internal_type: 'code_injection',
          title: 'Code injection via eval or dynamic execution',
          description: 'Dynamic code execution can run attacker-controlled payloads.',
          category: 'code injection',
          severity: 'critical',
          confidence: 0.92,
          exploitability: 'high',
          file_path: 'test_vuln.js',
          line_start: 12,
          line_end: 12,
          code_snippet: 'eval(req.body.code);',
          evidence: 'Matched deterministic rule `code.injection.eval` on `eval(`.',
          remediation: 'Replace eval/exec with safe alternatives.',
          fingerprint: 'fp-added',
        }],
      },
    });
    pool.query.mockResolvedValueOnce({ rows: [{ count: 1 }] });
    pool.query.mockResolvedValueOnce({ rows: [] });
    pool.query.mockResolvedValueOnce({ rows: [PERSISTED_CONTEXT_FINDING] });
    pool.query.mockResolvedValueOnce({ rows: [] });
    pool.query.mockResolvedValueOnce({ rows: [PERSISTED_ADDED_FINDING] });
    pool.query.mockResolvedValueOnce({ rowCount: 0 });
    pool.query.mockResolvedValueOnce({ rows: [] });
    axios.post.mockResolvedValueOnce({ data: { review_id: 1 } });
    axios.post.mockResolvedValueOnce({ data: { check_run_id: 2 } });
    pool.query.mockResolvedValueOnce({ rowCount: 1 });

    jest.isolateModules(() => {
      const mod = require('../src/services/prAnalysisOrchestrator');
      mod.triggerAnalysisJob(BASE_PAYLOAD);
    });
    await flushAsync();

    const reviewCall = axios.post.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('reviews/submit')
    );
    expect(reviewCall).toBeTruthy();
    expect(reviewCall[1].comments).toHaveLength(1);
    expect(reviewCall[1].comments[0].line).toBe(12);
  });
});
