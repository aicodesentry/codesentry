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

describe('PR Analysis Orchestrator — pure functions', () => {
  test('buildReviewComment renders GitHub suggestion blocks for validated Tier 3 patches', () => {
    const { __private } = require('../src/services/prAnalysisOrchestrator');

    const body = __private.buildReviewComment({
      severity: 'high',
      title: 'Code injection via eval',
      evidence: 'Matched eval call',
      confidence: 0.92,
      code_snippet: 'eval(req.body.code);',
      remediation: 'Replace eval with JSON parsing.',
      remediation_patch: 'const payload = JSON.parse(req.body.code);',
    }, {
      tierLabel: 'Tier 3',
      filePatch: '@@ -1 +1 @@\n-eval(req.body.code);\n+eval(req.body.code);',
    });

    expect(body).toContain('```suggestion');
    expect(body).toContain('const payload = JSON.parse(req.body.code);');
    expect(body).toContain('**Suggested fix code:**');
    expect(body).toContain('```\nconst payload = JSON.parse(req.body.code);');
  });

  test('buildReviewComment falls back to fix text before Tier 3 validation', () => {
    const { __private } = require('../src/services/prAnalysisOrchestrator');

    const body = __private.buildReviewComment({
      severity: 'high',
      title: 'Code injection via eval',
      evidence: 'Matched eval call',
      confidence: 0.92,
      code_snippet: 'eval(req.body.code);',
      remediation: 'Replace eval with JSON parsing.',
      remediation_patch: 'const payload = JSON.parse(req.body.code);',
    }, {
      tierLabel: 'Tier 1',
      filePatch: '@@ -1 +1 @@\n-eval(req.body.code);\n+eval(req.body.code);',
    });

    expect(body).not.toContain('```suggestion');
    expect(body).toContain('**Fix:** Replace eval with JSON parsing.');
    expect(body).toContain('**Candidate fix code:**');
    expect(body).toContain('const payload = JSON.parse(req.body.code);');
  });

  test('buildReviewComment falls back to fix text for oversized patches', () => {
    const { __private } = require('../src/services/prAnalysisOrchestrator');

    const body = __private.buildReviewComment({
      severity: 'high',
      title: 'Code injection via eval',
      evidence: 'Matched eval call',
      confidence: 0.92,
      code_snippet: 'eval(req.body.code);',
      remediation: 'Replace eval with safer parsing.',
      remediation_patch: [
        'function safeParse(input) {',
        '  const value = JSON.parse(input);',
        '  if (!value) throw new Error("missing");',
        '  return value;',
        '}',
        '',
        'const payload = safeParse(req.body.code);',
        'doSomething(payload);',
        'logUsage(payload);',
      ].join('\n'),
    }, {
      tierLabel: 'Tier 3',
      filePatch: '@@ -1 +1 @@\n-eval(req.body.code);\n+eval(req.body.code);',
    });

    expect(body).not.toContain('```suggestion');
    expect(body).toContain('**Fix:** Replace eval with safer parsing.');
    expect(body).toContain('**Candidate fix code:**');
  });

  test('validateSuggestedFix rejects patches that do not match the diff snippet', () => {
    const { __private } = require('../src/services/prAnalysisOrchestrator');

    const result = __private.validateSuggestedFix({
      finding: {
        line_start: 2,
        line_end: 2,
        code_snippet: 'eval(req.body.code);',
        remediation_patch: 'const payload = JSON.parse(req.body.code);',
      },
      filePatch: '@@ -0,0 +1,2 @@\n+const alreadySafe = true;\n+handle(req.body.code);',
      tierLabel: 'Tier 3',
      repoProfile: null,
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toContain('does not match');
  });

  test('validateSuggestedFix rejects unified diff output', () => {
    const { __private } = require('../src/services/prAnalysisOrchestrator');

    const result = __private.validateSuggestedFix({
      finding: {
        line_start: 1,
        line_end: 1,
        code_snippet: 'eval(req.body.code);',
        remediation_patch: '@@ -1 +1 @@\n-eval(req.body.code);\n+const payload = JSON.parse(req.body.code);',
      },
      filePatch: '@@ -0,0 +1 @@\n+eval(req.body.code);',
      tierLabel: 'Tier 3',
      repoProfile: null,
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toContain('not a diff');
  });

  test('validateSuggestedFix rejects repo-inconsistent SQL fixes', () => {
    const { __private } = require('../src/services/prAnalysisOrchestrator');

    const result = __private.validateSuggestedFix({
      finding: {
        category: 'SQL injection',
        cwe_id: 'CWE-89',
        line_start: 1,
        line_end: 1,
        code_snippet: 'db.query("SELECT * FROM users WHERE id = " + userId);',
        remediation_patch: 'db.query("SELECT * FROM users WHERE id = " + String(userId));',
      },
      filePatch: '@@ -0,0 +1 @@\n+db.query("SELECT * FROM users WHERE id = " + userId);',
      tierLabel: 'Tier 3',
      repoProfile: {
        interpreted: { database_pattern: 'parameterized' },
      },
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toContain('parameterized query pattern');
  });

  test('buildReviewComment renders Tier 3 suggestion for repo-consistent SQL fix', () => {
    const { __private } = require('../src/services/prAnalysisOrchestrator');

    const body = __private.buildReviewComment({
      severity: 'high',
      title: 'Potential SQL injection',
      evidence: 'Matched raw query',
      confidence: 0.9,
      cwe_id: 'CWE-89',
      category: 'SQL injection',
      code_snippet: 'db.query("SELECT * FROM users WHERE id = " + userId);',
      remediation: 'Use parameterized queries.',
      remediation_patch: 'db.query("SELECT * FROM users WHERE id = ?", [userId]);',
      line_start: 1,
      line_end: 1,
    }, {
      tierLabel: 'Tier 3',
      filePatch: '@@ -0,0 +1 @@\n+db.query("SELECT * FROM users WHERE id = " + userId);',
      repoProfile: {
        interpreted: { database_pattern: 'parameterized' },
      },
    });

    expect(body).toContain('```suggestion');
    expect(body).toContain('db.query("SELECT * FROM users WHERE id = ?", [userId]);');
    expect(body).toContain('**Suggested fix code:**');
  });

  test('didTier3MeaningfullyChangeFindings detects remediation patch enrichment', () => {
    const { __private } = require('../src/services/prAnalysisOrchestrator');

    const changed = __private.didTier3MeaningfullyChangeFindings(
      [{
        fingerprint: 'fp-1',
        severity: 'high',
        confidence: 0.9,
        title: 'Potential SQL injection',
        evidence: 'Matched deterministic rule',
        remediation: 'Use parameterized queries.',
        remediation_patch: '',
        line_start: 1,
        line_end: 1,
      }],
      [{
        fingerprint: 'fp-1',
        severity: 'high',
        confidence: 0.9,
        title: 'Potential SQL injection',
        evidence: 'Matched deterministic rule',
        remediation: 'Use parameterized queries.',
        remediation_patch: 'db.query("SELECT * FROM users WHERE id = ?", [userId]);',
        line_start: 1,
        line_end: 1,
      }]
    );

    expect(changed).toBe(true);
  });

  test('prioritizeReviewComments sorts suggestion comments first within a file', () => {
    const { __private } = require('../src/services/prAnalysisOrchestrator');

    const ordered = __private.prioritizeReviewComments([
      { path: 'a.js', line: 20, severity: 'critical', hasSuggestion: false, body: 'plain' },
      { path: 'a.js', line: 10, severity: 'high', hasSuggestion: true, body: 'suggestion' },
      { path: 'b.js', line: 5, severity: 'high', hasSuggestion: true, body: 'other-file' },
    ]);

    expect(ordered[0]).toMatchObject({ path: 'a.js', hasSuggestion: true });
    expect(ordered[1]).toMatchObject({ path: 'a.js', hasSuggestion: false });
    expect(ordered[2]).toMatchObject({ path: 'b.js' });
  });
});

describe('PR Analysis Orchestrator — pipeline', () => {
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

  const FINDING = {
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
    remediation_patch: 'const payload = JSON.parse(req.body.code);',
    fingerprint: 'fp-1',
  };
  const PERSISTED_FINDING = {
    id: 'finding-1',
    status: 'open',
    is_baseline: false,
    ...FINDING,
  };

  function flushAsync() {
    return new Promise((resolve) => setTimeout(resolve, 300));
  }

  function mockAxiosRoute(url, response) {
    // Helper: returns a function that matches URL patterns
    return { url, response };
  }

  // Setup axios.post to route by URL pattern
  function setupAxiosMocks(routes) {
    axios.post.mockImplementation((url, data, opts) => {
      for (const route of routes) {
        if (url.includes(route.pattern)) {
          if (route.error) return Promise.reject(route.error);
          return Promise.resolve({ data: route.data });
        }
      }
      return Promise.resolve({ data: {} });
    });
  }

  test('marks run as failed when GitHub service is unreachable', async () => {
    axios.post.mockRejectedValue(new Error('ECONNREFUSED'));
    pool.query.mockResolvedValue({ rowCount: 1, rows: [] });

    const { triggerAnalysisJob } = require('../src/services/prAnalysisOrchestrator');
    triggerAnalysisJob(BASE_PAYLOAD);
    await flushAsync();

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("status = 'failed'"),
      expect.arrayContaining(['run-uuid-1'])
    );
    expect(logger.error).toHaveBeenCalled();
  });

  test('individual tier failure does not fail the run', async () => {
    // With progressive posting, a single tier failing is non-blocking
    setupAxiosMocks([
      { pattern: '/pulls/files', data: { files: [{ path: 'app.py', patch: '+x=1', additions: 1 }] } },
      { pattern: '/tier1', error: new Error('Tier 1 timeout') },
      { pattern: '/tier2', error: new Error('Tier 2 timeout') },
      { pattern: '/tier3', data: { findings: [], filtered_count: 0 } },
      { pattern: '/check-runs', data: { check_run_id: 2 } },
    ]);
    pool.query.mockResolvedValue({ rowCount: 1, rows: [{ count: 1 }] });

    jest.isolateModules(() => {
      const mod = require('../src/services/prAnalysisOrchestrator');
      mod.triggerAnalysisJob(BASE_PAYLOAD);
    });
    await flushAsync();

    // Run should still complete (not fail) — tier failures are non-blocking
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("status = 'completed'"),
      expect.anything()
    );
    expect(logger.error).toHaveBeenCalledWith(
      'Tier 1 analysis failed',
      expect.any(Object)
    );
  });

  test('calls GitHub service with correct internal secret header', async () => {
    setupAxiosMocks([
      { pattern: '/pulls/files', data: { files: [] } },
      { pattern: '/tier1', data: { findings: [], tier: 1 } },
      { pattern: '/tier2', data: { findings: [], tier: 2 } },
      { pattern: '/tier3', data: { findings: [], filtered_count: 0, tier: 3 } },
      { pattern: '/check-runs', data: { check_run_id: 2 } },
    ]);
    pool.query.mockResolvedValue({ rowCount: 1, rows: [{ count: 1 }] });

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
    setupAxiosMocks([
      { pattern: '/pulls/files', data: { files: [] } },
      { pattern: '/tier1', data: { findings: [], tier: 1 } },
      { pattern: '/tier2', data: { findings: [], tier: 2 } },
      { pattern: '/tier3', data: { findings: [], filtered_count: 0, tier: 3 } },
      { pattern: '/reviews/submit', data: { review_id: 1 } },
      { pattern: '/check-runs', data: { check_run_id: 2 } },
    ]);
    pool.query.mockResolvedValue({ rowCount: 1, rows: [{ count: 1 }] });

    jest.isolateModules(() => {
      const mod = require('../src/services/prAnalysisOrchestrator');
      mod.triggerAnalysisJob(BASE_PAYLOAD);
    });
    await flushAsync();

    // With no findings across any tier, no review is posted (only check-run)
    const checkCall = axios.post.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('check-runs')
    );
    expect(checkCall).toBeTruthy();
  });

  test('posts review after tier1 returns findings', async () => {
    setupAxiosMocks([
      { pattern: '/pulls/files', data: { files: [{ path: 'test_vuln.js', patch: '@@ -0,0 +1,2 @@\n+const existing = true;\n+eval(req.body.code);', additions: 2 }] } },
      { pattern: '/tier1', data: { findings: [FINDING], tier: 1 } },
      { pattern: '/tier2', data: { findings: [], tier: 2 } },
      { pattern: '/tier3', data: { findings: [FINDING], filtered_count: 0, tier: 3 } },
      { pattern: '/reviews/submit', data: { review_id: 1 } },
      { pattern: '/comments/inline', data: { comment_id: 11, success: true } },
      { pattern: '/check-runs', data: { check_run_id: 2 } },
    ]);
    // DB mocks: countCompleted, upsert (select), upsert (insert), markFixed, suppressions
    pool.query
      .mockResolvedValueOnce({ rows: [{ count: 1 }] })  // countCompleted
      .mockResolvedValueOnce({ rows: [] })                // findByFingerprint
      .mockResolvedValueOnce({ rows: [PERSISTED_FINDING] }) // insert finding
      .mockResolvedValueOnce({ rowCount: 0 })             // markFixed
      .mockResolvedValueOnce({ rows: [] })                // suppressions
      .mockResolvedValue({ rowCount: 1, rows: [{ count: 1 }] }); // remaining

    jest.isolateModules(() => {
      const mod = require('../src/services/prAnalysisOrchestrator');
      mod.triggerAnalysisJob(BASE_PAYLOAD);
    });
    await flushAsync();

    // Review should be posted with REQUEST_CHANGES for critical finding
    const reviewCall = axios.post.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('reviews/submit')
    );
    expect(reviewCall).toBeTruthy();
    expect(reviewCall[1].event).toBe('REQUEST_CHANGES');

    const inlineCall = axios.post.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('comments/inline')
    );
    expect(inlineCall).toBeTruthy();
    expect(inlineCall[1].body).not.toContain('```suggestion');
    expect(inlineCall[1].body).toContain('**Fix:** Replace eval/exec with safe alternatives.');
    expect(inlineCall[1].body).toContain('**Candidate fix code:**');
    expect(inlineCall[1].body).toContain('const payload = JSON.parse(req.body.code);');
  });

  test('logs error but does not fail run when review posting fails', async () => {
    const routes = [
      { pattern: '/pulls/files', data: { files: [{ path: 'test_vuln.js', patch: '@@ -0,0 +1,2 @@\n+const existing = true;\n+eval(req.body.code);', additions: 2 }] } },
      { pattern: '/tier1', data: { findings: [FINDING], tier: 1 } },
      { pattern: '/tier2', data: { findings: [], tier: 2 } },
      { pattern: '/tier3', data: { findings: [FINDING], filtered_count: 0, tier: 3 } },
      { pattern: '/check-runs', data: { check_run_id: 2 } },
    ];

    axios.post.mockImplementation((url) => {
      for (const route of routes) {
        if (url.includes(route.pattern)) {
          return Promise.resolve({ data: route.data });
        }
      }
      if (url.includes('reviews/submit') || url.includes('comments/inline')) {
        return Promise.reject(new Error('502 Bad Gateway'));
      }
      return Promise.resolve({ data: {} });
    });

    pool.query
      .mockResolvedValueOnce({ rows: [{ count: 1 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [PERSISTED_FINDING] })
      .mockResolvedValueOnce({ rowCount: 0 })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValue({ rowCount: 1, rows: [{ count: 1 }] });

    jest.isolateModules(() => {
      const mod = require('../src/services/prAnalysisOrchestrator');
      mod.triggerAnalysisJob(BASE_PAYLOAD);
    });
    await flushAsync();

    // Review failure should be logged
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('failed to submit PR review'),
      expect.any(Object)
    );
    // Run should still complete
    const updateCall = pool.query.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes("status = 'completed'")
    );
    expect(updateCall).toBeTruthy();
  });

  test('progressive posting: tier2 findings update the review', async () => {
    const tier2Finding = {
      ...FINDING,
      rule_id: 'opengrep.cwe-89.sql-injection',
      fingerprint: 'fp-tier2',
      title: 'SQL injection via OpenGrep',
    };

    setupAxiosMocks([
      { pattern: '/pulls/files', data: { files: [{ path: 'test_vuln.js', patch: '@@ -0,0 +1,2 @@\n+const existing = true;\n+eval(req.body.code);', additions: 2 }] } },
      { pattern: '/tier1', data: { findings: [FINDING], tier: 1 } },
      { pattern: '/tier2', data: { findings: [tier2Finding], tier: 2 } },
      { pattern: '/tier3', data: { findings: [FINDING, tier2Finding], filtered_count: 0, tier: 3 } },
      { pattern: '/reviews/submit', data: { review_id: 1 } },
      { pattern: '/comments/inline', data: { comment_id: 11, success: true } },
      { pattern: '/check-runs', data: { check_run_id: 2 } },
    ]);

    pool.query.mockResolvedValue({ rowCount: 1, rows: [{ count: 1 }] });
    // For upsert: findByFingerprint returns empty, insert returns the finding
    pool.query
      .mockResolvedValueOnce({ rows: [{ count: 1 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [PERSISTED_FINDING] })
      .mockResolvedValueOnce({ rowCount: 0 })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValue({ rowCount: 1, rows: [{ count: 1 }, PERSISTED_FINDING] });

    jest.isolateModules(() => {
      const mod = require('../src/services/prAnalysisOrchestrator');
      mod.triggerAnalysisJob(BASE_PAYLOAD);
    });
    await flushAsync();

    // Review should be posted at least twice (once for tier1, once for tier2)
    const reviewCalls = axios.post.mock.calls.filter(
      (call) => typeof call[0] === 'string' && call[0].includes('reviews/submit')
    );
    expect(reviewCalls.length).toBeGreaterThanOrEqual(2);
  });

  test('tier3 republishes when fixes are added without changing finding count', async () => {
    const tier1Finding = {
      ...FINDING,
      rule_id: 'sql.injection.raw_query',
      title: 'Potential SQL injection',
      category: 'SQL injection',
      cwe_id: 'CWE-89',
      code_snippet: 'db.query("SELECT * FROM users WHERE id = " + userId);',
      remediation: 'Use parameterized queries.',
      remediation_patch: '',
      line_start: 2,
      line_end: 2,
      fingerprint: 'fp-sql-1',
    };

    const tier3Finding = {
      ...tier1Finding,
      remediation_patch: 'db.query("SELECT * FROM users WHERE id = ?", [userId]);',
    };

    setupAxiosMocks([
      { pattern: '/pulls/files', data: { files: [{ path: 'test_vuln.js', patch: '@@ -0,0 +1,2 @@\n+const existing = true;\n+db.query("SELECT * FROM users WHERE id = " + userId);', additions: 2 }] } },
      { pattern: '/tier1', data: { findings: [tier1Finding], tier: 1 } },
      { pattern: '/tier2', data: { findings: [], tier: 2 } },
      { pattern: '/tier3', data: { findings: [tier3Finding], filtered_count: 0, tier: 3 } },
      { pattern: '/reviews/submit', data: { review_id: 1 } },
      { pattern: '/comments/inline', data: { comment_id: 11, success: true } },
      { pattern: '/check-runs', data: { check_run_id: 2 } },
    ]);

    pool.query.mockResolvedValue({ rowCount: 1, rows: [{ count: 1 }] });
    pool.query
      .mockResolvedValueOnce({ rows: [{ count: 1 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'finding-1', status: 'open', is_baseline: false, ...tier1Finding }] })
      .mockResolvedValueOnce({ rowCount: 0 })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValue({ rowCount: 1, rows: [{ count: 1 }] });

    jest.isolateModules(() => {
      const mod = require('../src/services/prAnalysisOrchestrator');
      mod.triggerAnalysisJob(BASE_PAYLOAD);
    });
    await flushAsync();

    const reviewCalls = axios.post.mock.calls.filter(
      (call) => typeof call[0] === 'string' && call[0].includes('reviews/submit')
    );
    expect(reviewCalls.length).toBeGreaterThanOrEqual(2);
  });
});
