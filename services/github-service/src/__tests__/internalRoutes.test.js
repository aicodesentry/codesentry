jest.mock('axios');
jest.mock('../services/githubAppAuth', () => ({
  getInstallationToken: jest.fn(),
}));

const axios = require('axios');
const githubAppAuth = require('../services/githubAppAuth');
const internalRouter = require('../routes/internal');

function findRouteHandler(path) {
  const layer = internalRouter.stack.find(
    (entry) => entry.route && entry.route.path === path && entry.route.methods.post
  );
  return layer.route.stack[layer.route.stack.length - 1].handle;
}

function createRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe('internal GitHub routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    githubAppAuth.getInstallationToken.mockResolvedValue('installation-token');
  });

  test('POST /github/files/content returns decoded file contents', async () => {
    const handler = findRouteHandler('/github/files/content');
    axios.mockResolvedValueOnce({
      data: 'const value = req.query.file;\nfs.readFile(value);\n',
    });

    const req = {
      body: {
        repository_full_name: 'owner/repo',
        installation_id: 12345,
        ref: 'abc123',
        paths: ['src/app.js'],
      },
    };
    const res = createRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.files).toEqual([
      {
        path: 'src/app.js',
        content: 'const value = req.query.file;\nfs.readFile(value);\n',
      },
    ]);
    expect(githubAppAuth.getInstallationToken).toHaveBeenCalledWith(12345);
  });
});
