const crypto = require('crypto');

function calculateFingerprint(finding) {
  const data = [
    finding.rule_id,
    finding.file_path,
    String(finding.line_start || 0),
    (finding.code_snippet || '').trim(),
  ].join('|');
  return crypto.createHash('sha256').update(data).digest('hex');
}

function normalizeFinding(raw) {
  return {
    rule_id: raw.rule_id,
    title: raw.title,
    description: raw.description,
    category: raw.category,
    cwe_id: raw.cwe_id || null,
    owasp_category: raw.owasp_category || null,
    severity: (raw.severity || 'low').toLowerCase(),
    confidence: Math.max(0, Math.min(1, Number(raw.confidence || 0))),
    exploitability: raw.exploitability || 'medium',
    file_path: raw.file_path,
    line_start: raw.line_start || 1,
    line_end: raw.line_end || raw.line_start || 1,
    code_snippet: raw.code_snippet || '',
    evidence: raw.evidence || raw.description || '',
    exploit_scenario: raw.exploit_scenario || '',
    remediation: raw.remediation || '',
    remediation_patch_optional: raw.remediation_patch_optional || '',
  };
}

module.exports = {
  calculateFingerprint,
  normalizeFinding,
};
