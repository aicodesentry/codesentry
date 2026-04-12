function normalizePatch(text) {
  if (!text) return '';

  let normalized = String(text).trim();
  if (!normalized) return '';

  const fencedMatch = normalized.match(/^```[a-zA-Z0-9_-]*\n([\s\S]*?)\n```$/);
  if (fencedMatch) {
    normalized = fencedMatch[1].trim();
  }

  return normalized.replace(/\r\n/g, '\n');
}

function extractReviewableLines(patch) {
  const reviewable = new Set();
  if (!patch) return reviewable;

  let newLine = 0;
  for (const rawLine of String(patch).split('\n')) {
    if (rawLine.startsWith('@@')) {
      const match = rawLine.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) newLine = Number(match[1]);
      continue;
    }
    if (rawLine.startsWith('+++ ') || rawLine.startsWith('--- ')) {
      continue;
    }
    if (rawLine.startsWith('+')) {
      reviewable.add(newLine || 1);
      newLine += 1;
      continue;
    }
    if (rawLine.startsWith('-')) {
      continue;
    }
    newLine += 1;
  }

  return reviewable;
}

function extractAddedBlock(patch, lineStart, lineEnd) {
  if (!patch || !lineStart) return '';

  let newLine = 0;
  const collected = [];
  const maxLine = lineEnd || lineStart;

  for (const rawLine of String(patch).split('\n')) {
    if (rawLine.startsWith('@@')) {
      const match = rawLine.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) newLine = Number(match[1]);
      continue;
    }
    if (rawLine.startsWith('+++ ') || rawLine.startsWith('--- ')) {
      continue;
    }
    if (rawLine.startsWith('+')) {
      if (newLine >= lineStart && newLine <= maxLine) {
        collected.push(rawLine.slice(1));
      }
      newLine += 1;
      continue;
    }
    if (!rawLine.startsWith('-')) {
      newLine += 1;
    }
  }

  return collected.join('\n').trim();
}

function countMeaningfulLines(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean).length;
}

function lineRange(start, end) {
  const first = Number(start) || 0;
  const last = Number(end) || first;
  if (first <= 0 || last < first) return [];

  const lines = [];
  for (let line = first; line <= last; line += 1) {
    lines.push(line);
  }
  return lines;
}

function includesBroadRewriteConstruct(text) {
  return String(text || '')
    .split('\n')
    .some((line) => /^(import\s+|from\s+\S+\s+import\s+|const\s+\S+\s*=\s*require\(|require\(|def\s+|class\s+|function\s+)/.test(line.trim()));
}

function looksLikeUnifiedDiff(text) {
  return String(text || '')
    .split('\n')
    .some((line) => /^(diff --git|index |@@|--- |\+\+\+ )/.test(line.trim()) || /^[+-][^=]/.test(line.trim()));
}

function looksLikeParameterizedQuery(text) {
  return /(\$\d+|%s|\?)/.test(text) || /\.query\([^,]+,\s*[\[(]/.test(text);
}

function validateAgainstRepoProfile(finding, suggestionPatch, repoProfile) {
  if (!repoProfile || typeof repoProfile !== 'object') {
    return { ok: true, reasons: ['repo profile unavailable; using structural validation only'] };
  }

  const deterministic = repoProfile.deterministic || {};
  const interpreted = repoProfile.interpreted || {};
  const reasons = [];
  const category = String(finding?.category || '').toLowerCase();
  const cweId = String(finding?.cwe_id || '').toUpperCase();

  if (interpreted.database_pattern === 'parameterized') {
    const isSqlFinding = category.includes('sql') || cweId === 'CWE-89';
    if (isSqlFinding && !looksLikeParameterizedQuery(suggestionPatch)) {
      return {
        ok: false,
        reasons: ['suggestion does not match the repo parameterized query pattern'],
      };
    }
    if (looksLikeParameterizedQuery(suggestionPatch)) {
      reasons.push('suggestion aligns with parameterized query pattern from repo profile');
    }
  }

  if (deterministic.framework) {
    reasons.push(`repo framework detected as ${deterministic.framework}`);
  }

  return { ok: true, reasons };
}

function validateSuggestedFix({ finding, filePatch, tierLabel, repoProfile }) {
  const suggestionPatch = normalizePatch(finding?.remediation_patch);
  if (!suggestionPatch) {
    return { ok: false, reason: 'missing suggestion patch' };
  }

  if (tierLabel !== 'Tier 3') {
    return { ok: false, reason: 'suggestions are only rendered after Tier 3 triage' };
  }

  if (suggestionPatch.includes('```')) {
    return { ok: false, reason: 'suggestion patch contains markdown fences' };
  }

  const suggestionLines = suggestionPatch.split('\n');
  if (suggestionLines.length > 8) {
    return { ok: false, reason: 'suggestion patch exceeds 8 lines' };
  }

  const snippet = normalizePatch(finding?.code_snippet);
  const snippetLines = countMeaningfulLines(snippet) || 1;
  if (suggestionLines.length > snippetLines + 3) {
    return { ok: false, reason: 'suggestion patch is too large relative to flagged snippet' };
  }

  if (snippet && normalizePatch(snippet) === suggestionPatch) {
    return { ok: false, reason: 'suggestion patch is identical to current code' };
  }

  if (includesBroadRewriteConstruct(suggestionPatch)) {
    return { ok: false, reason: 'suggestion patch introduces imports or broad code structure changes' };
  }

  if (looksLikeUnifiedDiff(suggestionPatch)) {
    return { ok: false, reason: 'suggestion patch must be raw replacement code, not a diff' };
  }

  const reviewableLines = extractReviewableLines(filePatch);
  const targetLines = lineRange(finding?.line_start || 1, finding?.line_end || finding?.line_start || 1);
  if (targetLines.length === 0 || targetLines.some((line) => !reviewableLines.has(line))) {
    return { ok: false, reason: 'finding line is not reviewable in the PR diff' };
  }

  const addedBlock = extractAddedBlock(filePatch, finding?.line_start || 1, finding?.line_end || finding?.line_start || 1);
  if (snippet && addedBlock && normalizePatch(addedBlock) !== snippet) {
    return { ok: false, reason: 'flagged snippet does not match the added lines in the PR diff' };
  }

  const repoValidation = validateAgainstRepoProfile(finding, suggestionPatch, repoProfile);
  if (!repoValidation.ok) {
    return { ok: false, reason: repoValidation.reasons?.[0] || 'repo profile rejected suggestion' };
  }

  return {
    ok: true,
    reason: 'validated for inline GitHub suggestion rendering',
    details: repoValidation.reasons,
  };
}

module.exports = {
  validateSuggestedFix,
  __private: {
    extractAddedBlock,
    extractReviewableLines,
    includesBroadRewriteConstruct,
    lineRange,
    looksLikeUnifiedDiff,
    normalizePatch,
  },
};
