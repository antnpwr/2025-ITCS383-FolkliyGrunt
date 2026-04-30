const request = require('supertest');
const app = require('../server');

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
});
