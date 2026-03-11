const { calculateFingerprint, normalizeFinding } = require('../src/findingUtils');

describe('finding utils', () => {
  test('fingerprint is stable for equivalent finding input', () => {
    const finding = {
      rule_id: 'sql.injection.raw_query',
      file_path: 'api/users.js',
      line_start: 42,
      code_snippet: 'SELECT * FROM users WHERE id = ' + 'userInput',
    };

    const fp1 = calculateFingerprint(finding);
    const fp2 = calculateFingerprint({ ...finding });

    expect(fp1).toEqual(fp2);
    expect(fp1).toHaveLength(64);
  });

  test('normalize clamps confidence and fills defaults', () => {
    const normalized = normalizeFinding({
      rule_id: 'secret.hardcoded.credential',
      title: 'Hardcoded secret',
      description: 'Bad secret pattern',
      category: 'hardcoded secrets',
      severity: 'CRITICAL',
      confidence: 1.2,
      file_path: 'config.js',
    });

    expect(normalized.severity).toBe('critical');
    expect(normalized.confidence).toBe(1);
    expect(normalized.line_start).toBe(1);
    expect(normalized.exploitability).toBe('medium');
  });
});
