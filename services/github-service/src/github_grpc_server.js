const grpc = require('@grpc/grpc-js');
const githubPb = require('./grpc/generated/github_pb');
const githubGrpc = require('./grpc/generated/github_grpc_pb');
const commonPb = require('./grpc/generated/common_pb');
const {
  createCheckRun,
  fetchFileContents,
  fetchPullRequestFiles,
  postInlineComment,
  submitPullRequestReview,
} = require('./services/githubInternalOperations');

const HEALTH_SERVING_STATUS = 1;

function readVarint(buffer, offset) {
  let result = 0;
  let shift = 0;
  let cursor = offset;
  while (cursor < buffer.length) {
    const byte = buffer[cursor];
    result |= (byte & 0x7f) << shift;
    cursor += 1;
    if ((byte & 0x80) === 0) {
      return { value: result, offset: cursor };
    }
    shift += 7;
  }
  return { value: result, offset: cursor };
}

function decodeHealthCheckRequest(buffer) {
  let offset = 0;
  let service = '';
  while (offset < buffer.length) {
    const tag = buffer[offset];
    offset += 1;
    if (tag === 0x0a) {
      const length = readVarint(buffer, offset);
      offset = length.offset;
      service = buffer.subarray(offset, offset + length.value).toString('utf8');
      offset += length.value;
    } else {
      break;
    }
  }
  return { service };
}

function encodeHealthCheckResponse(response = {}) {
  return Buffer.from([0x08, Number(response.status || HEALTH_SERVING_STATUS)]);
}

const standardHealthService = {
  check: {
    path: '/grpc.health.v1.Health/Check',
    requestStream: false,
    responseStream: false,
    requestSerialize: () => Buffer.alloc(0),
    requestDeserialize: decodeHealthCheckRequest,
    responseSerialize: encodeHealthCheckResponse,
    responseDeserialize: () => ({ status: HEALTH_SERVING_STATUS }),
  },
};

const standardHealthHandlers = {
  check: (call, callback) => {
    callback(null, { status: HEALTH_SERVING_STATUS });
  },
};

function operationErrorToGrpc(error) {
  if (error.statusCode === 400) {
    return { code: grpc.status.INVALID_ARGUMENT, message: error.message };
  }
  if (error.statusCode === 502) {
    return { code: grpc.status.UNAVAILABLE, message: error.message };
  }
  return { code: grpc.status.INTERNAL, message: error.message || 'Internal error' };
}

function toChangedFile(file) {
  const message = new commonPb.ChangedFile();
  message.setPath(file.path || '');
  message.setPatch(file.patch || '');
  message.setContent(file.content || '');
  message.setAdditions(Number(file.additions || 0));
  message.setDeletions(Number(file.deletions || 0));
  message.setStatus(file.status || '');
  message.setRawUrl(file.raw_url || '');
  return message;
}

function toFetchPullRequestFilesPayload(request) {
  return {
    repository_full_name: request.getRepositoryFullName(),
    pull_request_number: request.getPullRequestNumber(),
    installation_id: request.getInstallationId(),
  };
}

function toFetchFileContentsPayload(request) {
  return {
    repository_full_name: request.getRepositoryFullName(),
    installation_id: request.getInstallationId(),
    ref: request.getRef(),
    paths: request.getPathsList(),
  };
}

function toSubmitReviewPayload(request) {
  return {
    owner: request.getOwner(),
    repo: request.getRepo(),
    pr_number: request.getPrNumber(),
    installation_id: request.getInstallationId(),
    commit_sha: request.getCommitSha(),
    body: request.getBody(),
    event: request.getEvent(),
    comments: request.getCommentsList().map((comment) => ({
      path: comment.getPath(),
      line: comment.getLine(),
      body: comment.getBody(),
    })),
  };
}

function toPostInlineCommentPayload(request) {
  return {
    owner: request.getOwner(),
    repo: request.getRepo(),
    pr_number: request.getPrNumber(),
    installation_id: request.getInstallationId(),
    commit_sha: request.getCommitSha(),
    path: request.getPath(),
    line: request.getLine(),
    body: request.getBody(),
  };
}

function toCreateCheckRunPayload(request) {
  return {
    owner: request.getOwner(),
    repo: request.getRepo(),
    installation_id: request.getInstallationId(),
    head_sha: request.getHeadSha(),
    conclusion: request.getConclusion(),
    title: request.getTitle(),
    summary: request.getSummary(),
  };
}

function unary(handler, buildResponse) {
  return async (call, callback) => {
    try {
      const result = await handler(call.request);
      callback(null, buildResponse(result));
    } catch (error) {
      callback(operationErrorToGrpc(error));
    }
  };
}

const githubService = {
  fetchPullRequestFiles: unary(
    async (request) => fetchPullRequestFiles(toFetchPullRequestFilesPayload(request)),
    (result) => {
      const response = new githubPb.FetchPullRequestFilesResponse();
      response.setFilesList((result.files || []).map(toChangedFile));
      return response;
    }
  ),

  fetchFileContents: unary(
    async (request) => fetchFileContents(toFetchFileContentsPayload(request)),
    (result) => {
      const response = new githubPb.FetchFileContentsResponse();
      response.setFilesList((result.files || []).map((file) => {
        const message = new githubPb.FileContent();
        message.setPath(file.path || '');
        message.setContent(file.content || '');
        return message;
      }));
      return response;
    }
  ),

  submitPullRequestReview: unary(
    async (request) => submitPullRequestReview(toSubmitReviewPayload(request)),
    (result) => {
      const response = new githubPb.SubmitPullRequestReviewResponse();
      response.setReviewId(Number(result.review_id || 0));
      response.setCommentsPosted(Number(result.comments_posted || 0));
      return response;
    }
  ),

  postInlineComment: unary(
    async (request) => postInlineComment(toPostInlineCommentPayload(request)),
    (result) => {
      const response = new githubPb.PostInlineCommentResponse();
      response.setCommentId(Number(result.comment_id || 0));
      response.setUrl(result.url || '');
      response.setSuccess(Boolean(result.success));
      return response;
    }
  ),

  createCheckRun: unary(
    async (request) => createCheckRun(toCreateCheckRunPayload(request)),
    (result) => {
      const response = new githubPb.CreateCheckRunResponse();
      response.setCheckRunId(Number(result.check_run_id || 0));
      return response;
    }
  ),

  healthCheck: (call, callback) => {
    const response = new commonPb.HealthCheckResponse();
    response.setStatus('ok');
    response.setService('github-service');
    response.setVersion('1.0.0');
    callback(null, response);
  },
};

function createServer() {
  const server = new grpc.Server();
  server.addService(githubGrpc.GitHubServiceService, githubService);
  server.addService(standardHealthService, standardHealthHandlers);
  return server;
}

function startServer() {
  const port = Number(process.env.GITHUB_GRPC_PORT || process.env.PORT || 50051);
  const server = createServer();
  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (error) => {
    if (error) {
      throw error;
    }
    console.log(`GitHub gRPC service listening on ${port}`);
  });
  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = {
  createServer,
  githubService,
  startServer,
};
