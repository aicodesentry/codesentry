const axios = require('axios');

const ANALYSIS_SERVICE_URL = process.env.ANALYSIS_SERVICE_URL || 'http://analysis-service:8001';

function mapFindingToLegacyVulnerability(finding) {
  return {
    type: finding.category || 'security',
    severity: finding.severity || 'low',
    title: finding.title || finding.rule_id || 'Security finding',
    description: finding.description || finding.evidence || '',
    line: finding.line_start || 1,
    code_snippet: finding.code_snippet || '',
    recommendation: finding.remediation || '',
    confidence: finding.confidence || 0,
    category: finding.category || 'unknown',
  };
}

class AnalysisClient {
  async analyzeWithPRPayload(code, filePath, prNumber, repository) {
    const payload = {
      repository_full_name: repository,
      pull_request_number: Number(prNumber),
      commit_sha: 'unknown',
      files: [
        {
          path: filePath,
          patch: code,
          additions: 0,
          deletions: 0,
          status: 'modified',
        },
      ],
    };

    const response = await axios.post(`${ANALYSIS_SERVICE_URL}/analyze/pr`, payload, {
      timeout: 600000,
    });

    const findings = response.data.findings || [];
    return {
      vulnerabilities: findings.map(mapFindingToLegacyVulnerability),
      style_issues: [],
      total_vulnerabilities: findings.length,
      total_style_issues: 0,
    };
  }

  async analyzeWithLegacyEndpoint(code, filePath, prNumber, repository) {
    const response = await axios.post(
      `${ANALYSIS_SERVICE_URL}/api/analysis/analyze`,
      {
        code: code,
        language: 'python',
        file_path: filePath,
        pr_number: prNumber,
        repository: repository,
      },
      {
        timeout: 600000,
      }
    );

    return response.data;
  }

  /**
   * SCRUM-88: Call analysis-service to analyze Python code
   */
  async analyzeCode(code, filePath, prNumber, repository, retries = 2) {
    try {
      console.log(`[ANALYZE] Analyzing Python file: ${filePath}`);

      let data;
      try {
        data = await this.analyzeWithPRPayload(code, filePath, prNumber, repository);
      } catch (prPayloadError) {
        const status = prPayloadError.response?.status;
        if (status !== 404) {
          throw prPayloadError;
        }
        data = await this.analyzeWithLegacyEndpoint(code, filePath, prNumber, repository);
      }

      console.log(`[SUCCESS] Analysis complete: ${data.total_vulnerabilities || 0} vulnerabilities found`);
      return data;
    } catch (error) {
      console.error(`[ERROR] Analysis failed for ${filePath}:`, error.message);

      // Retry on 502/503/504 errors (service temporarily unavailable)
      if (retries > 0 && error.response && [502, 503, 504].includes(error.response.status)) {
        console.log(`[RETRY] Retrying analysis for ${filePath} (${retries} retries left)...`);
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        return this.analyzeCode(code, filePath, prNumber, repository, retries - 1);
      }

      // Return empty result instead of throwing - continue with other files
      console.error(`[SKIP] Skipping ${filePath} due to analysis failure`);
      return {
        vulnerabilities: [],
        style_issues: [],
        total_vulnerabilities: 0,
        total_style_issues: 0,
        error: error.message
      };
    }
  }

  /**
   * Check if analysis service is healthy
   */
  async healthCheck() {
    try {
      const response = await axios.get(`${ANALYSIS_SERVICE_URL}/health`, {
        timeout: 5000
      });
      return response.data;
    } catch (error) {
      console.error('[ERROR] Analysis service health check failed:', error.message);
      return null;
    }
  }
}

module.exports = new AnalysisClient();
