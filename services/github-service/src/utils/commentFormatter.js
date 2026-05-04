class CommentFormatter {
  /**
   * Format batched security vulnerabilities comment (CodeRabbit-style)
   */
  formatBatchedSecurityComment(findings, fileName) {
    if (!findings || findings.length === 0) return null;

    // Group by severity
    const grouped = {
      critical: [],
      high: [],
      medium: [],
      low: []
    };

    findings.forEach((finding) => {
      const severity = finding.severity?.toLowerCase() || 'low';
      if (grouped[severity]) {
        grouped[severity].push(finding);
      }
    });

    const totalCount = findings.length;
    const criticalCount = grouped.critical.length;
    const highCount = grouped.high.length;
    const mediumCount = grouped.medium.length;
    const lowCount = grouped.low.length;

    // Header with summary
    let comment = `## 🔒 Security Analysis\n\n`;
    comment += `**File:** \`${fileName}\`\n\n`;

    // Summary badges
    comment += ``;
    if (criticalCount > 0) comment += `![Critical](https://img.shields.io/badge/Critical-${criticalCount}-red) `;
    if (highCount > 0) comment += `![High](https://img.shields.io/badge/High-${highCount}-orange) `;
    if (mediumCount > 0) comment += `![Medium](https://img.shields.io/badge/Medium-${mediumCount}-yellow) `;
    if (lowCount > 0) comment += `![Low](https://img.shields.io/badge/Low-${lowCount}-blue) `;
    comment += `\n\n`;

    // Priority message
    if (criticalCount > 0 || highCount > 0) {
      comment += `> **⚠️ Action Required:** Found ${criticalCount + highCount} high-priority security ${(criticalCount + highCount) === 1 ? 'issue' : 'issues'} that should be addressed before merging.\n\n`;
    } else {
      comment += `> **📋 Review Recommended:** Found ${totalCount} security ${totalCount === 1 ? 'issue' : 'issues'} for your review.\n\n`;
    }

    comment += `---\n\n`;

    // Findings by severity
    const severities = ['critical', 'high', 'medium', 'low'];
    severities.forEach(severity => {
      const issues = grouped[severity];
      if (issues.length === 0) return;

      const emoji = this.getSeverityEmoji(severity);
      const label = this.getSeverityLabel(severity);

      comment += `### ${emoji} ${label}\n\n`;

      issues.forEach((finding, index) => {
        const findingTitle = finding.title || finding.rule_id || 'Security finding';
        const lineInfo = finding.line_start ? ` (Line ${finding.line_start})` : '';

        comment += `<details>\n`;
        comment += `<summary><strong>${index + 1}. ${findingTitle}${lineInfo}</strong></summary>\n\n`;

        if (finding.cwe_id || finding.owasp_category) {
          comment += `**Classification:** ${[finding.cwe_id, finding.owasp_category].filter(Boolean).join(' • ')}\n\n`;
        }

        comment += `**Description:**\n`;
        comment += `${finding.description}\n\n`;

        // Show code snippet if available
        if (finding.code_snippet) {
          comment += `**Code:**\n\`\`\`python\n${finding.code_snippet}\n\`\`\`\n\n`;
        }

        // Context
        const impact = finding.exploit_scenario || finding.evidence || this.buildImpactText(finding, severity);
        if (impact) {
          comment += `**Context:**\n`;
          comment += `${impact}\n\n`;
        }

        // Recommendation (collapsible)
        comment += `<details>\n`;
        comment += `<summary><strong>💡 Recommended Solution</strong></summary>\n\n`;
        comment += `${finding.remediation || this.buildRecommendationText(finding, severity)}\n\n`;
        comment += `</details>\n\n`;

        // Confidence indicator
        if (finding.confidence < 0.7) {
          comment += `> **Note:** This finding has moderate confidence. Please review the context carefully.\n\n`;
        }

        comment += `</details>\n\n`;
      });
    });

    comment += `---\n\n`;
    comment += `<sub>Powered by **Mitig8it** • [Report Issue](https://github.com/nebullii/aicode-review-assistant/issues)</sub>`;

    return comment;
  }

  /**
   * Format summary comment (CodeRabbit-style)
   */
  formatSummaryComment(fileName, analysisResult) {
    const {
      total_vulnerabilities,
      critical_count,
      high_count,
      medium_count,
      low_count,
      total_style_issues = 0,
      style_categories = {}
    } = analysisResult;

    const hasVulnerabilities = total_vulnerabilities > 0;
    const hasStyleIssues = total_style_issues > 0;

    // Clean code - no issues
    if (!hasVulnerabilities && !hasStyleIssues) {
      return `## ✅ Code Review Complete\n\n` +
             `**File:** \`${fileName}\`\n\n` +
             `![Passing](https://img.shields.io/badge/Security-✓_Passed-brightgreen) ` +
             `![Quality](https://img.shields.io/badge/Quality-✓_Good-brightgreen)\n\n` +
             `> **Well done!** No security vulnerabilities or code quality issues detected.\n\n` +
             `---\n\n` +
             `<sub>Powered by **Mitig8it**</sub>`;
    }

    let summary = `## 📊 Code Analysis Report\n\n`;
    summary += `**File:** \`${fileName}\`\n\n`;

    // Badges
    if (hasVulnerabilities) {
      summary += `**Security:** `;
      if (critical_count > 0) summary += `![Critical](https://img.shields.io/badge/Critical-${critical_count}-red) `;
      if (high_count > 0) summary += `![High](https://img.shields.io/badge/High-${high_count}-orange) `;
      if (medium_count > 0) summary += `![Medium](https://img.shields.io/badge/Medium-${medium_count}-yellow) `;
      if (low_count > 0) summary += `![Low](https://img.shields.io/badge/Low-${low_count}-blue) `;
      summary += `\n\n`;
    }

    if (hasStyleIssues) {
      summary += `**Code Quality:** ![Issues](https://img.shields.io/badge/Suggestions-${total_style_issues}-blue)\n\n`;
    }

    // Summary table
    summary += `<details>\n<summary><strong>📈 Analysis Summary</strong></summary>\n\n`;
    summary += `| Category | Count |\n`;
    summary += `|----------|------:|\n`;

    if (hasVulnerabilities) {
      if (critical_count > 0) summary += `| 🔴 Critical Security Issues | ${critical_count} |\n`;
      if (high_count > 0) summary += `| 🟠 High Security Issues | ${high_count} |\n`;
      if (medium_count > 0) summary += `| 🟡 Medium Security Issues | ${medium_count} |\n`;
      if (low_count > 0) summary += `| 🔵 Low Security Issues | ${low_count} |\n`;
    }

    if (hasStyleIssues && Object.keys(style_categories).length > 0) {
      if (style_categories.pep8) summary += `| 📝 PEP 8 Style | ${style_categories.pep8} |\n`;
      if (style_categories.pylint) summary += `| ⚙️ Code Quality | ${style_categories.pylint} |\n`;
      if (style_categories.naming) summary += `| 🏷️ Naming Conventions | ${style_categories.naming} |\n`;
      if (style_categories.complexity) summary += `| 🔄 Complexity | ${style_categories.complexity} |\n`;
    }

    summary += `\n</details>\n\n`;

    // Priority message
    if (critical_count > 0 || high_count > 0) {
      summary += `> **⚠️ Priority:** Please review the ${critical_count + high_count} high-priority security ${(critical_count + high_count) === 1 ? 'issue' : 'issues'} before merging.\n\n`;
    } else if (hasVulnerabilities) {
      summary += `> **📋 Review:** Security findings detected. Please review the recommendations below.\n\n`;
    }

    if (hasStyleIssues) {
      summary += `> **💡 Tip:** Addressing code quality suggestions will improve maintainability.\n\n`;
    }

    summary += `---\n\n`;
    summary += `**Next Steps:**\n`;
    summary += `- Review detailed comments below\n`;
    summary += `- Apply recommended fixes\n`;
    summary += `- Re-run analysis after changes\n\n`;

    summary += `<sub>Powered by **Mitig8it**</sub>`;

    return summary;
  }

  // Helper methods
  getSeverityEmoji(severity) {
    const emojis = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🔵',
      info: '⚪',
    };
    return emojis[severity] || '⚪';
  }

  getCategoryEmoji(category) {
    const emojis = {
      'pep8': '📝',
      'pylint': '⚙️',
      'naming': '🏷️',
      'complexity': '🔄',
      'unused_import': '📦',
      'unused_variable': '🗑️',
      'class_name': '🏛️',
      'function_name': '⚡',
    };
    return emojis[category] || '💡';
  }

  getSeverityLabel(severity) {
    const labels = {
      critical: 'Critical Priority',
      high: 'High Priority',
      medium: 'Medium Priority',
      low: 'Low Priority'
    };
    return labels[severity] || severity.charAt(0).toUpperCase() + severity.slice(1);
  }

  buildImpactText(vuln, severity) {
    if (!vuln) return null;

    // Prefer explicit impact if the analysis service provides it
    if (vuln.impact) {
      return vuln.impact;
    }

    const typeContext = this.getSecurityContext(vuln.type, severity);
    const severityContext = this.getSeverityRiskNote(severity);

    if (typeContext && severityContext) return `${typeContext} ${severityContext}`;
    return typeContext || severityContext || null;
  }

  getSeverityRiskNote(severity) {
    const notes = {
      critical: 'Critical severity indicates high exploitability and should block the merge until fixed.',
      high: 'High severity issue that could expose data or enable compromise if merged without a fix.',
      medium: 'Medium severity risk; may be exploitable in certain scenarios and should be addressed soon.',
      low: 'Low severity issue; fix to harden the codebase and prevent future regressions.'
    };
    return notes[severity] || null;
  }

  buildRecommendationText(vuln, severity) {
    const steps = [];
    if (vuln.recommendation) {
      steps.push(vuln.recommendation);
    }

    const fixPriors = {
      critical: 'Treat as merge-blocker. Patch immediately and add a regression test.',
      high: 'Prioritize before release; add tests covering the vulnerable path.',
      medium: 'Fix in the next sprint and cover with unit/integration tests.',
      low: 'Plan a hardening fix; add lint/guardrails to prevent recurrence.'
    };

    const pri = fixPriors[severity];
    if (pri) steps.push(`**Priority:** ${pri}`);

    if (steps.length === 0) {
      return 'Review this area and apply a fix before merging.';
    }

    return steps.join('\n\n');
  }

  formatVulnTypeHuman(type) {
    if (!type) return 'Security Issue';

    // Handle both underscore format and human-readable format from Vertex AI
    const typeMap = {
      // Underscore format (legacy)
      'sql_injection': 'SQL Injection',
      'cross_site_scripting': 'Cross-Site Scripting (XSS)',
      'authentication_bypass': 'Authentication Bypass',
      'authorization_bypass': 'Authorization Bypass',
      'broken_access_control': 'Broken Access Control',
      'sensitive_data_exposure': 'Sensitive Data Exposure',
      'xml_external_entities': 'XML External Entity (XXE)',
      'insecure_deserialization': 'Insecure Deserialization',
      'security_misconfiguration': 'Security Misconfiguration',
      'injection_flaw': 'Injection Flaw',
      'insecure_dependencies': 'Insecure Dependency',
      'insecure_dependency': 'Insecure Dependency',
      'hardcoded_secret': 'Hardcoded Secret',
      'weak_crypto': 'Insecure Cryptography',
      'command_injection': 'Command Injection',
      'path_traversal': 'Path Traversal',
      'race_condition': 'Race Condition',
      'memory_safety': 'Memory Safety Issue',
      // Human-readable format (from improved Vertex AI prompt) - already good
      'SQL Injection': 'SQL Injection',
      'Cross-Site Scripting (XSS)': 'Cross-Site Scripting (XSS)',
      'Command Injection': 'Command Injection',
      'Authentication Bypass': 'Authentication Bypass',
      'Authorization Bypass': 'Authorization Bypass',
      'Insecure Deserialization': 'Insecure Deserialization',
      'Sensitive Data Exposure': 'Sensitive Data Exposure',
      'XML External Entity (XXE)': 'XML External Entity (XXE)',
      'Broken Access Control': 'Broken Access Control',
      'Security Misconfiguration': 'Security Misconfiguration',
      'Path Traversal': 'Path Traversal',
      'Insecure Cryptography': 'Insecure Cryptography',
      'Race Condition': 'Race Condition',
      'Memory Safety': 'Memory Safety Issue',
      'Injection Flaw': 'Injection Flaw',
      'Insecure Dependency': 'Insecure Dependency',
      'Security Issue': 'Security Issue',
      // Generic fallback
      'unknown': 'Security Issue',
      'Unknown': 'Security Issue',
    };

    return typeMap[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  formatCategoryNameHuman(category) {
    const names = {
      'pep8': 'PEP 8 Style Guidelines',
      'pylint': 'Code Quality & Best Practices',
      'naming': 'Naming Conventions',
      'complexity': 'Code Complexity',
      'class_name': 'Class Naming',
      'function_name': 'Function Naming',
      'constant_name': 'Constant Naming',
      'unused_import': 'Unused Imports',
      'unused_variable': 'Unused Variables'
    };
    return names[category] || category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  getSecurityContext(type, _severity) {
    const contexts = {
      // Underscore format (legacy)
      'sql_injection': 'SQL injection allows attackers to manipulate database queries, potentially leading to unauthorized data access, modification, or deletion.',
      'cross_site_scripting': 'XSS vulnerabilities enable attackers to inject malicious scripts that execute in users\' browsers, potentially stealing sensitive data or hijacking sessions.',
      'authentication_bypass': 'Authentication flaws can allow unauthorized access to protected resources or user accounts, compromising system security.',
      'authorization_bypass': 'Authorization flaws enable users to access resources or perform actions beyond their permitted scope.',
      'sensitive_data_exposure': 'Exposing sensitive information like passwords, API keys, or personal data creates significant security risks and compliance issues.',
      'broken_access_control': 'Access control weaknesses enable users to perform actions or access data beyond their authorized permissions.',
      'insecure_deserialization': 'Insecure deserialization can lead to remote code execution, allowing attackers to run arbitrary code on your server.',
      'security_misconfiguration': 'Security misconfigurations often provide attackers with easy entry points into your application.',
      'injection_flaw': 'Injection vulnerabilities allow attackers to send malicious input that gets executed as code or commands.',
      'hardcoded_secret': 'Hardcoded secrets in source code can be easily discovered by attackers, compromising your entire system.',
      'weak_crypto': 'Weak cryptographic algorithms or implementations can be broken by attackers, exposing sensitive data.',
      'command_injection': 'Command injection allows attackers to execute arbitrary system commands, potentially compromising the entire server.',
      'path_traversal': 'Path traversal vulnerabilities allow attackers to access files outside the intended directory, potentially exposing sensitive data.',
      'race_condition': 'Race conditions can lead to unpredictable behavior and security vulnerabilities when multiple operations occur simultaneously.',
      'memory_safety': 'Memory safety issues like buffer overflows can lead to crashes, data corruption, or remote code execution.',
      // Human-readable format (from Vertex AI)
      'SQL Injection': 'SQL injection allows attackers to manipulate database queries, potentially leading to unauthorized data access, modification, or deletion.',
      'Cross-Site Scripting (XSS)': 'XSS vulnerabilities enable attackers to inject malicious scripts that execute in users\' browsers, potentially stealing sensitive data or hijacking sessions.',
      'Command Injection': 'Command injection allows attackers to execute arbitrary system commands, potentially compromising the entire server.',
      'Authentication Bypass': 'Authentication flaws can allow unauthorized access to protected resources or user accounts, compromising system security.',
      'Authorization Bypass': 'Authorization flaws enable users to access resources or perform actions beyond their permitted scope.',
      'Insecure Deserialization': 'Insecure deserialization can lead to remote code execution, allowing attackers to run arbitrary code on your server.',
      'Sensitive Data Exposure': 'Exposing sensitive information like passwords, API keys, or personal data creates significant security risks and compliance issues.',
      'XML External Entity (XXE)': 'XXE vulnerabilities can lead to sensitive data disclosure, server-side request forgery, or denial of service attacks.',
      'Broken Access Control': 'Access control weaknesses enable users to perform actions or access data beyond their authorized permissions.',
      'Security Misconfiguration': 'Security misconfigurations often provide attackers with easy entry points into your application.',
      'Path Traversal': 'Path traversal vulnerabilities allow attackers to access files outside the intended directory, potentially exposing sensitive data.',
      'Insecure Cryptography': 'Weak cryptographic algorithms or implementations can be broken by attackers, exposing sensitive data.',
      'Race Condition': 'Race conditions can lead to unpredictable behavior and security vulnerabilities when multiple operations occur simultaneously.',
      'Memory Safety': 'Memory safety issues like buffer overflows can lead to crashes, data corruption, or remote code execution.',
      'Injection Flaw': 'Injection vulnerabilities allow attackers to send malicious input that gets executed as code or commands.',
      'Insecure Dependency': 'Using outdated or vulnerable dependencies exposes your application to known security vulnerabilities.',
      'Security Issue': 'This security issue requires attention to prevent potential exploitation.',
    };

    return contexts[type] || 'This security issue requires attention to prevent potential exploitation.';
  }

  getCategoryContext(category) {
    const contexts = {
      'pep8': 'Following PEP 8 improves code readability and helps maintain consistency across the codebase.',
      'pylint': 'Addressing code quality issues reduces bugs and makes the code easier to maintain.',
      'naming': 'Consistent naming conventions help developers understand code purpose and structure quickly.',
      'complexity': 'Reducing complexity makes code easier to test, debug, and maintain.',
      'unused_import': 'Removing unused imports keeps the codebase clean and reduces unnecessary dependencies.',
      'unused_variable': 'Eliminating unused variables improves code clarity and prevents confusion.',
    };
    return contexts[category] || null;
  }
}

module.exports = new CommentFormatter();
