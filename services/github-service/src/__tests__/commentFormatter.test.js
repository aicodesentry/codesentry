const formatter = require('../utils/commentFormatter');

describe('formatBatchedSecurityComment', () => {
  it('returns null for empty findings', () => {
    expect(formatter.formatBatchedSecurityComment([], 'app.py')).toBeNull();
    expect(formatter.formatBatchedSecurityComment(null, 'app.py')).toBeNull();
  });

  it('includes file name in output', () => {
    const findings = [{ severity: 'high', title: 'SQL Injection', description: 'Bad query', remediation: 'Fix it' }];
    const result = formatter.formatBatchedSecurityComment(findings, 'server.js');
    expect(result).toContain('`server.js`');
  });

  it('groups findings by severity', () => {
    const findings = [
      { severity: 'critical', title: 'RCE', description: 'd', remediation: 'r' },
      { severity: 'high', title: 'SQLi', description: 'd', remediation: 'r' },
      { severity: 'low', title: 'Info', description: 'd', remediation: 'r' },
    ];
    const result = formatter.formatBatchedSecurityComment(findings, 'app.py');
    expect(result).toContain('Critical Priority');
    expect(result).toContain('High Priority');
    expect(result).toContain('Low Priority');
  });

  it('shows action required when critical/high findings exist', () => {
    const findings = [{ severity: 'critical', title: 'RCE', description: 'd', remediation: 'r' }];
    const result = formatter.formatBatchedSecurityComment(findings, 'app.py');
    expect(result).toContain('Action Required');
  });

  it('shows review recommended when only medium/low findings', () => {
    const findings = [{ severity: 'medium', title: 'Info', description: 'd', remediation: 'r' }];
    const result = formatter.formatBatchedSecurityComment(findings, 'app.py');
    expect(result).toContain('Review Recommended');
  });

  it('generates severity badges', () => {
    const findings = [
      { severity: 'critical', title: 'a', description: 'd', remediation: 'r' },
      { severity: 'critical', title: 'b', description: 'd', remediation: 'r' },
    ];
    const result = formatter.formatBatchedSecurityComment(findings, 'f.py');
    expect(result).toContain('Critical-2-red');
  });

  it('shows moderate confidence note when confidence < 0.7', () => {
    const findings = [{ severity: 'low', title: 'Maybe', description: 'd', remediation: 'r', confidence: 0.5 }];
    const result = formatter.formatBatchedSecurityComment(findings, 'f.py');
    expect(result).toContain('moderate confidence');
  });

  it('includes code snippet when present', () => {
    const findings = [{ severity: 'high', title: 'Issue', description: 'd', remediation: 'r', code_snippet: 'eval(input)' }];
    const result = formatter.formatBatchedSecurityComment(findings, 'f.py');
    expect(result).toContain('eval(input)');
  });
});

describe('formatSummaryComment', () => {
  it('shows passing message when no issues', () => {
    const result = formatter.formatSummaryComment('clean.py', {
      total_vulnerabilities: 0,
      critical_count: 0,
      high_count: 0,
      medium_count: 0,
      low_count: 0,
    });
    expect(result).toContain('Passed');
    expect(result).toContain('No security vulnerabilities');
  });

  it('shows severity badges when vulnerabilities exist', () => {
    const result = formatter.formatSummaryComment('bad.py', {
      total_vulnerabilities: 3,
      critical_count: 1,
      high_count: 1,
      medium_count: 1,
      low_count: 0,
    });
    expect(result).toContain('Critical-1-red');
    expect(result).toContain('High-1-orange');
    expect(result).toContain('Medium-1-yellow');
    expect(result).not.toContain('Low-0');
  });

  it('shows priority message for critical/high', () => {
    const result = formatter.formatSummaryComment('bad.py', {
      total_vulnerabilities: 1,
      critical_count: 1,
      high_count: 0,
      medium_count: 0,
      low_count: 0,
    });
    expect(result).toContain('Priority');
  });

  it('includes style issue count when present', () => {
    const result = formatter.formatSummaryComment('file.py', {
      total_vulnerabilities: 0,
      critical_count: 0,
      high_count: 0,
      medium_count: 0,
      low_count: 0,
      total_style_issues: 5,
      style_categories: { pep8: 3, naming: 2 },
    });
    expect(result).toContain('Suggestions-5-blue');
    expect(result).toContain('PEP 8');
  });
});

describe('helper methods', () => {
  it('getSeverityEmoji returns correct emojis', () => {
    expect(formatter.getSeverityEmoji('critical')).toBe('🔴');
    expect(formatter.getSeverityEmoji('high')).toBe('🟠');
    expect(formatter.getSeverityEmoji('medium')).toBe('🟡');
    expect(formatter.getSeverityEmoji('low')).toBe('🔵');
    expect(formatter.getSeverityEmoji('unknown')).toBe('⚪');
  });

  it('getSeverityLabel returns correct labels', () => {
    expect(formatter.getSeverityLabel('critical')).toBe('Critical Priority');
    expect(formatter.getSeverityLabel('high')).toBe('High Priority');
    expect(formatter.getSeverityLabel('unknown')).toBe('Unknown');
  });

  it('formatVulnTypeHuman maps known types', () => {
    expect(formatter.formatVulnTypeHuman('sql_injection')).toBe('SQL Injection');
    expect(formatter.formatVulnTypeHuman('cross_site_scripting')).toBe('Cross-Site Scripting (XSS)');
    expect(formatter.formatVulnTypeHuman('Command Injection')).toBe('Command Injection');
  });

  it('formatVulnTypeHuman falls back for unknown types', () => {
    expect(formatter.formatVulnTypeHuman('some_new_type')).toBe('Some New Type');
    expect(formatter.formatVulnTypeHuman(null)).toBe('Security Issue');
  });

  it('buildImpactText prefers explicit impact', () => {
    const vuln = { impact: 'Custom impact text', type: 'sql_injection' };
    expect(formatter.buildImpactText(vuln, 'high')).toBe('Custom impact text');
  });

  it('buildImpactText falls back to type context + severity note', () => {
    const vuln = { type: 'sql_injection' };
    const result = formatter.buildImpactText(vuln, 'high');
    expect(result).toContain('SQL injection');
    expect(result).toContain('High severity');
  });

  it('buildImpactText returns null for null vuln', () => {
    expect(formatter.buildImpactText(null, 'low')).toBeNull();
  });
});
