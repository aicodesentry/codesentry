const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Load proto files
const PROTO_PATH = path.join(__dirname, '../../../../proto');

const analysisProtoPath = path.join(PROTO_PATH, 'analysis.proto');
const githubProtoPath = path.join(PROTO_PATH, 'github.proto');

const packageDefinition = protoLoader.loadSync(
  [analysisProtoPath, githubProtoPath],
  {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  }
);

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);

// gRPC clients
let analysisClient = null;
let githubClient = null;

/**
 * Initialize gRPC clients
 */
function initializeClients() {
  const GITHUB_SERVICE_URL = process.env.GITHUB_SERVICE_GRPC_URL || 'github-service:50051';
  const ANALYSIS_SERVICE_URL = process.env.ANALYSIS_SERVICE_GRPC_URL || 'analysis-service:50052';

  // Create GitHub service client
  githubClient = new protoDescriptor.github.GitHubService(
    GITHUB_SERVICE_URL,
    grpc.credentials.createInsecure()
  );

  // Create Analysis service client
  analysisClient = new protoDescriptor.analysis.AnalysisService(
    ANALYSIS_SERVICE_URL,
    grpc.credentials.createInsecure()
  );

  console.log('✅ gRPC clients initialized');
  console.log(`   - GitHub Service: ${GITHUB_SERVICE_URL}`);
  console.log(`   - Analysis Service: ${ANALYSIS_SERVICE_URL}`);
}

/**
 * GitHub Service Methods
 */
const githubService = {
  async getPullRequest(owner, repo, pullNumber, installationId) {
    return new Promise((resolve, reject) => {
      githubClient.GetPullRequest(
        { owner, repo, pull_number: pullNumber, installation_id: installationId },
        (error, response) => {
          if (error) reject(error);
          else resolve(response);
        }
      );
    });
  },

  async postComment(owner, repo, pullNumber, body, commitId, installationId, path = '', line = 0) {
    return new Promise((resolve, reject) => {
      githubClient.PostComment(
        {
          owner,
          repo,
          pull_number: pullNumber,
          body,
          commit_id: commitId,
          path,
          line,
          installation_id: installationId
        },
        (error, response) => {
          if (error) reject(error);
          else resolve(response);
        }
      );
    });
  },

  async updateStatus(owner, repo, commitSha, state, context, description, targetUrl, installationId) {
    return new Promise((resolve, reject) => {
      githubClient.UpdateStatus(
        {
          owner,
          repo,
          commit_sha: commitSha,
          state,
          context,
          description,
          target_url: targetUrl,
          installation_id: installationId
        },
        (error, response) => {
          if (error) reject(error);
          else resolve(response);
        }
      );
    });
  },

  async getRepositoryFiles(owner, repo, ref, paths, installationId) {
    return new Promise((resolve, reject) => {
      githubClient.GetRepositoryFiles(
        { owner, repo, ref, paths, installation_id: installationId },
        (error, response) => {
          if (error) reject(error);
          else resolve(response);
        }
      );
    });
  },

  async healthCheck() {
    return new Promise((resolve, reject) => {
      githubClient.HealthCheck({}, (error, response) => {
        if (error) reject(error);
        else resolve(response);
      });
    });
  }
};

/**
 * Analysis Service Methods
 */
const analysisService = {
  async analyzeCode(pullRequestId, repositoryId, files, config) {
    return new Promise((resolve, reject) => {
      analysisClient.AnalyzeCode(
        {
          pull_request_id: pullRequestId,
          repository_id: repositoryId,
          files,
          config
        },
        (error, response) => {
          if (error) reject(error);
          else resolve(response);
        }
      );
    });
  },

  async getAnalysis(analysisId) {
    return new Promise((resolve, reject) => {
      analysisClient.GetAnalysis(
        { analysis_id: analysisId },
        (error, response) => {
          if (error) reject(error);
          else resolve(response);
        }
      );
    });
  },

  async batchAnalyze(requests) {
    return new Promise((resolve, reject) => {
      analysisClient.BatchAnalyze(
        { requests },
        (error, response) => {
          if (error) reject(error);
          else resolve(response);
        }
      );
    });
  },

  async healthCheck() {
    return new Promise((resolve, reject) => {
      analysisClient.HealthCheck({}, (error, response) => {
        if (error) reject(error);
        else resolve(response);
      });
    });
  }
};

module.exports = {
  initializeClients,
  githubService,
  analysisService
};
