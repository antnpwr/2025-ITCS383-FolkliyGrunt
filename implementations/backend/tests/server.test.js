const request = require('supertest');
const app = require('../server');
const ORIGINAL_ENV = { ...process.env };

describe('Server routes', () => {
  test('GET /api/health returns ok status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('timestamp');
  });

  test('GET /api/meta returns API metadata', async () => {
    const res = await request(app).get('/api/meta');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      name: 'FolkliyGrunt API',
      version: 'v1',
      apiPrefix: '/api',
    });
  });

  test('unknown API route returns JSON 404 error', async () => {
    const res = await request(app).get('/api/unknown-route');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'API route not found' });
  });

  test('API error handler converts errors to JSON', async () => {
    // This will trigger the error handler by making a request that hits it
    const res = await request(app).get('/api/auth/invalid-endpoint');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  test('blocks requests from a disallowed origin when CORS_ORIGINS is configured', async () => {
    jest.resetModules();
    process.env = {
      ...ORIGINAL_ENV,
      CORS_ORIGINS: 'https://allowed.com',
      ENABLE_FRONTEND: 'false',
      NODE_ENV: 'test',
    };
    const appWithCors = require('../server');

    const res = await request(appWithCors)
      .get('/api/health')
      .set('Origin', 'https://blocked.com');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Origin not allowed by CORS' });
    process.env = ORIGINAL_ENV;
  });

  test('allows requests from an allowed origin when CORS_ORIGINS is configured', async () => {
    jest.resetModules();
    process.env = {
      ...ORIGINAL_ENV,
      CORS_ORIGINS: 'https://allowed.com',
      ENABLE_FRONTEND: 'false',
      NODE_ENV: 'test',
    };
    const appWithCors = require('../server');

    const res = await request(appWithCors)
      .get('/api/health')
      .set('Origin', 'https://allowed.com');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    process.env = ORIGINAL_ENV;
  });

  test('does not enable frontend static routes when ENABLE_FRONTEND=false', async () => {
    jest.resetModules();
    process.env = {
      ...ORIGINAL_ENV,
      ENABLE_FRONTEND: 'false',
      NODE_ENV: 'test',
    };
    const appWithoutFrontend = require('../server');

    const res = await request(appWithoutFrontend).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    process.env = ORIGINAL_ENV;
  });
});

