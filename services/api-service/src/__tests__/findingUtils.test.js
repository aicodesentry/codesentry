const {
  calculateFingerprint,
  normalizeFinding,
  normalizeEvidenceDetails,
  normalizeTaxonomyMappings,
} = require('../services/findingUtils');

describe('calculateFingerprint', () => {
  const base = {
    rule_id: 'sql.injection.raw_query',
    file_path: 'app.py',
    line_start: 10,
    code_snippet: 'SELECT * FROM users WHERE id = ' + "'" + 'input' + "'",
  };

  it('returns a 64-char hex SHA-256 hash', () => {
    const fp = calculateFingerprint(base);
    expect(fp).toMatch(/^[a-f0-9]{64}$/);
  });

  it('is deterministic for the same input', () => {
    expect(calculateFingerprint(base)).toBe(calculateFingerprint(base));
  });

  it('changes when rule_id differs', () => {
    const other = { ...base, rule_id: 'xss.unsafe_html_render' };
    expect(calculateFingerprint(base)).not.toBe(calculateFingerprint(other));
  });

  it('changes when file_path differs', () => {
    const other = { ...base, file_path: 'other.py' };
    expect(calculateFingerprint(base)).not.toBe(calculateFingerprint(other));
  });

  it('changes when line_start differs', () => {
    const other = { ...base, line_start: 99 };
    expect(calculateFingerprint(base)).not.toBe(calculateFingerprint(other));
  });

  it('changes when code_snippet differs', () => {
    const other = { ...base, code_snippet: 'different code' };
    expect(calculateFingerprint(base)).not.toBe(calculateFingerprint(other));
  });

  it('treats missing line_start as 0', () => {
    const a = { ...base, line_start: undefined };
    const b = { ...base, line_start: 0 };
    expect(calculateFingerprint(a)).toBe(calculateFingerprint(b));
  });

  it('trims code_snippet whitespace', () => {
    const a = { ...base, code_snippet: '  code  ' };
    const b = { ...base, code_snippet: 'code' };
    expect(calculateFingerprint(a)).toBe(calculateFingerprint(b));
  });
});

describe('normalizeFinding', () => {
  const raw = {
    rule_id: 'sql.injection.raw_query',
    title: 'SQL Injection',
    description: 'Bad query',
    category: 'SQL injection',
    cwe_id: 'CWE-89',
    owasp_category: 'A03:2021',
    internal_type: 'sql_injection',
    taxonomy_mappings: {
      cwe: ['CWE-89'],
      owasp: ['A03:2021'],
      attack: ['T1190'],
      capec: ['CAPEC-66'],
    },
    taxonomy_versions: {
      cwe: '4.18',
      attack: '17.0',
      capec: '3.9',
      owasp: '2021',
    },
    severity: 'HIGH',
    confidence: 0.86,
    exploitability: 'high',
    file_path: 'app.py',
    line_start: 10,
    line_end: 12,
    code_snippet: 'SELECT *',
    evidence: 'string concat',
    exploit_scenario: 'auth bypass',
    remediation: 'use parameterized queries',
    remediation_patch: 'fix code',
    analysis_scope: 'taint-intraprocedural',
    source: 'request-controlled input',
    sink: 'filesystem access',
    sanitizers_seen: ['path.basename'],
    trace_summary: 'Taint-tracked flow from request input to a sink.',
  };

  it('maps all fields from raw input', () => {
    const n = normalizeFinding(raw);
    expect(n.rule_id).toBe(raw.rule_id);
    expect(n.title).toBe(raw.title);
    expect(n.category).toBe(raw.category);
    expect(n.cwe_id).toBe(raw.cwe_id);
    expect(n.internal_type).toBe('sql_injection');
    expect(n.taxonomy_mappings.attack).toEqual(['T1190']);
    expect(n.file_path).toBe(raw.file_path);
    expect(n.line_start).toBe(10);
    expect(n.line_end).toBe(12);
    expect(n.analysis_scope).toBe('taint-intraprocedural');
    expect(n.source).toBe('request-controlled input');
    expect(n.sanitizers_seen).toEqual(['path.basename']);
    expect(n.evidence_details.trace_summary).toContain('Taint-tracked');
  });

  it('lowercases severity', () => {
    expect(normalizeFinding(raw).severity).toBe('high');
    expect(normalizeFinding({ ...raw, severity: 'CRITICAL' }).severity).toBe('critical');
  });

  it('defaults severity to low when missing', () => {
    const n = normalizeFinding({ ...raw, severity: undefined });
    expect(n.severity).toBe('low');
  });

  it('clamps confidence to [0, 1]', () => {
    expect(normalizeFinding({ ...raw, confidence: 1.5 }).confidence).toBe(1);
    expect(normalizeFinding({ ...raw, confidence: -0.3 }).confidence).toBe(0);
    expect(normalizeFinding({ ...raw, confidence: 0.5 }).confidence).toBe(0.5);
  });

  it('defaults confidence to 0 when missing', () => {
    expect(normalizeFinding({ ...raw, confidence: undefined }).confidence).toBe(0);
  });

  it('defaults exploitability to medium', () => {
    expect(normalizeFinding({ ...raw, exploitability: undefined }).exploitability).toBe('medium');
  });

  it('computes fingerprint when none provided', () => {
    const n = normalizeFinding({ ...raw, fingerprint: undefined });
    expect(n.fingerprint).toMatch(/^[a-f0-9]{64}$/);
  });

  it('uses provided fingerprint when present', () => {
    const fp = 'abc123';
    expect(normalizeFinding({ ...raw, fingerprint: fp }).fingerprint).toBe(fp);
  });

  it('defaults empty fields to safe fallbacks', () => {
    const minimal = { rule_id: 'test', file_path: 'f.py' };
    const n = normalizeFinding(minimal);
    expect(n.code_snippet).toBe('');
    expect(n.evidence).toBe('');
    expect(n.exploit_scenario).toBe('');
    expect(n.remediation).toBe('');
    expect(n.line_start).toBe(1);
    expect(n.cwe_id).toBeNull();
    expect(n.owasp_category).toBeNull();
    expect(n.taxonomy_mappings).toEqual({ cwe: [], owasp: [], attack: [], capec: [] });
  });
});

describe('normalizeEvidenceDetails', () => {
  it('hydrates structured evidence from top-level fields', () => {
    expect(normalizeEvidenceDetails({
      analysis_scope: 'taint-intraprocedural',
      source: 'request-controlled input',
      sink: 'filesystem access',
      sanitizers_seen: ['path.basename'],
      trace_summary: 'Taint flow',
    })).toEqual({
      analysis_scope: 'taint-intraprocedural',
      is_taint_based: true,
      source_type: 'request-controlled input',
      source_expr: null,
      sink_type: 'filesystem access',
      sink_expr: null,
      sanitizer_exprs: ['path.basename'],
      sanitizer_status: 'present',
      trace_steps: [],
      trace_summary: 'Taint flow',
      reviewability: 'changed-lines-only',
      fix_scope: 'line',
      fix_target_line: null,
      fix_target_expr: null,
      missing_control_type: null,
      auto_fix_eligible: false,
    });
  });

  it('normalizes trace steps to a language-agnostic shape', () => {
    expect(normalizeEvidenceDetails({
      file_path: 'handler.js',
      evidence_details: {
        sanitizer_status: 'present-but-insufficient',
        trace_steps: [
          { kind: 'Assignment', expr: 'const file = req.query.file', line: 12 },
          { kind: 'sink', expr: 'fs.readFile(file)', file: 'handler.js', line: 18, status: 'present' },
        ],
        fix_scope: 'block',
        fix_target_line: 18,
        fix_target_expr: 'fs.readFile(file)',
        missing_control_type: 'base_dir_validation',
        auto_fix_eligible: true,
      },
    })).toEqual({
      analysis_scope: 'pattern',
      is_taint_based: false,
      source_type: null,
      source_expr: null,
      sink_type: null,
      sink_expr: null,
      sanitizer_exprs: [],
      sanitizer_status: 'present-but-insufficient',
      trace_steps: [
        {
          kind: 'assignment',
          label: 'assignment',
          expr: 'const file = req.query.file',
          file: 'handler.js',
          line: 12,
        },
        {
          kind: 'sink',
          label: 'sink',
          expr: 'fs.readFile(file)',
          file: 'handler.js',
          line: 18,
          status: 'present',
        },
      ],
      trace_summary: null,
      reviewability: 'changed-lines-only',
      fix_scope: 'block',
      fix_target_line: 18,
      fix_target_expr: 'fs.readFile(file)',
      missing_control_type: 'base_dir_validation',
      auto_fix_eligible: true,
    });
  });

  it('drops language-specific or malformed trace steps', () => {
    expect(normalizeEvidenceDetails({
      file_path: 'handler.js',
      evidence_details: {
        trace_steps: [
          { kind: 'member_expression', expr: 'req.query.file', line: 12 },
          { kind: 'source', expr: '', line: 12 },
          { kind: 'source', expr: 'req.query.file', line: 12 },
        ],
      },
    }).trace_steps).toEqual([
      {
        kind: 'source',
        label: 'source',
        expr: 'req.query.file',
        file: 'handler.js',
        line: 12,
      },
    ]);
  });
});

describe('normalizeTaxonomyMappings', () => {
  it('hydrates mappings from legacy scalar fields', () => {
    expect(normalizeTaxonomyMappings({ cwe_id: 'CWE-89', owasp_category: 'A03:2021' })).toEqual({
      cwe: ['CWE-89'],
      owasp: ['A03:2021'],
      attack: [],
      capec: [],
    });
  });

  it('deduplicates and stringifies mixed values', () => {
    expect(normalizeTaxonomyMappings({
      taxonomy_mappings: {
        cwe: ['CWE-89', 'CWE-89'],
        attack: ['T1190', 'T1190'],
        capec: ['CAPEC-66'],
        owasp: ['A03:2021'],
      },
    })).toEqual({
      cwe: ['CWE-89'],
      owasp: ['A03:2021'],
      attack: ['T1190'],
      capec: ['CAPEC-66'],
    });
  });
});
