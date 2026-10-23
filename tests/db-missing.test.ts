import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';

// Simulates a deployment where DATABASE_URL was never configured
vi.mock('../src/lib/db', () => ({
  dbConfigured: false,
  sql: Object.assign(vi.fn(async () => []), { unsafe: vi.fn() }),
}));

let app: import('express').Express;

beforeAll(async () => {
  process.env.NODE_ENV = 'production';
  process.env.ADMIN_API_KEY = 'secret';
  app = (await import('../src/index')).default;
});

describe('missing DATABASE_URL', () => {
  it('keeps the app up and explains the problem instead of crashing', async () => {
    await request(app).get('/').expect(200);

    for (const path of ['/api/site', '/api/portfolio', '/api/works', '/api/posts']) {
      const res = await request(app).get(path).expect(503);
      expect(res.body.error).toContain('DATABASE_URL');
    }
  });
});
