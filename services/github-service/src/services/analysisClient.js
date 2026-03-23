const axios = require('axios');

const ANALYSIS_SERVICE_URL = process.env.ANALYSIS_SERVICE_URL || 'http://analysis-service:8001';

class AnalysisClient {
  /**
   * Call analysis-service and return canonical findings payload.
   */
  async analyzeCode(code, filePath, prNumber, repository, retries = 2) {
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

    try {
      console.log(`[ANALYZE] Analyzing Python file: ${filePath}`);
      const response = await axios.post(`${ANALYSIS_SERVICE_URL}/analyze/pr`, payload, {
        timeout: 600000,
      });
      const data = response.data;
      console.log(`[SUCCESS] Analysis complete: ${(data.findings || []).length} findings found`);
      return data;
    } catch (error) {
      console.error(`[ERROR] Analysis failed for ${filePath}:`, error.message);

      if (retries > 0 && error.response && [502, 503, 504].includes(error.response.status)) {
        console.log(`[RETRY] Retrying analysis for ${filePath} (${retries} retries left)...`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return this.analyzeCode(code, filePath, prNumber, repository, retries - 1);
      }

      console.error(`[SKIP] Skipping ${filePath} due to analysis failure`);
      return {
        repository_full_name: repository,
        pull_request_number: Number(prNumber),
        commit_sha: 'unknown',
        files_analyzed: 1,
        findings: [],
        error: error.message,
      };
    }
  }

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
