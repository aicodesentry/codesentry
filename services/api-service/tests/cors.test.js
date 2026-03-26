const request = require('supertest');

jest.mock('../src/config/database', () => ({
  pool: { query: jest.fn() },
  transaction: jest.fn(),
}));

const { createApp } = require('../src/app');

describe('CORS configuration', () => {
  test('allows codesentry .web.app origins', async () => {
    const app = createApp();

    const response = await request(app)
      .options('/health')
      .set('Origin', 'https://codesentry-260311-9f2b.web.app')
      .set('Access-Control-Request-Method', 'GET');

    expect(response.headers['access-control-allow-origin']).toBe(
      'https://codesentry-260311-9f2b.web.app'
    );
  });

  test('allows localhost origins', async () => {
    const app = createApp();

    const response = await request(app)
      .options('/health')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET');

    expect(response.headers['access-control-allow-origin']).toBe(
      'http://localhost:5173'
    );
  });

  test('rejects unknown origins', async () => {
    const app = createApp();

    const response = await request(app)
      .get('/health')
      .set('Origin', 'https://evil.com');

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});
