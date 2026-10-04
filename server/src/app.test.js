import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from './app.js';

describe('Server Health Check', () => {
  it('GET /api/health returns status ok', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('GET /api/unknown-route returns 404 in standardized error format', async () => {
    const response = await request(app).get('/api/unknown-route');
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
  });
});
