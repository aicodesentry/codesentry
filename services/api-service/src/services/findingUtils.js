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

function normalizeStringList(value) {
  if (value === undefined || value === null) return [];

  const values = Array.isArray(value) ? value : [value];
  const normalized = [];
  for (const item of values) {
    if (item === undefined || item === null) continue;
    if (typeof item === 'object' && !Array.isArray(item)) {
      for (const nested of Object.values(item)) {
        normalized.push(...normalizeStringList(nested));
      }
      continue;
    }
    const text = String(item).trim();
    if (!text) continue;
    if (!normalized.includes(text)) normalized.push(text);
  }
  return normalized;
}

function normalizeTaxonomyMappings(raw) {
  const input = raw.taxonomy_mappings || {};
  const cwe = normalizeStringList(input.cwe?.length ? input.cwe : raw.cwe_id);
  const owasp = normalizeStringList(input.owasp?.length ? input.owasp : raw.owasp_category);
  const attack = normalizeStringList(input.attack);
  const capec = normalizeStringList(input.capec);

  return { cwe, owasp, attack, capec };
}

function normalizeFinding(raw) {
  const taxonomyMappings = normalizeTaxonomyMappings(raw);
  const taxonomyVersions = raw.taxonomy_versions && typeof raw.taxonomy_versions === 'object'
    ? {
        cwe: raw.taxonomy_versions.cwe || null,
        attack: raw.taxonomy_versions.attack || null,
        capec: raw.taxonomy_versions.capec || null,
        owasp: raw.taxonomy_versions.owasp || null,
      }
    : {
        cwe: null,
        attack: null,
        capec: null,
        owasp: null,
      };

  return {
    rule_id: raw.rule_id,
    internal_type: raw.internal_type || raw.rule_id || 'security_issue',
    title: raw.title,
    description: raw.description,
    category: raw.category,
    cwe_id: taxonomyMappings.cwe[0] || raw.cwe_id || null,
    owasp_category: taxonomyMappings.owasp[0] || raw.owasp_category || null,
    taxonomy_mappings: taxonomyMappings,
    taxonomy_versions: taxonomyVersions,
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
    remediation_patch: raw.remediation_patch || '',
    fingerprint: raw.fingerprint || calculateFingerprint(raw),
  };
}

module.exports = {
  calculateFingerprint,
  normalizeFinding,
  normalizeTaxonomyMappings,
};
