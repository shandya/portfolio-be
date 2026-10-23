import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';

vi.mock('../src/lib/db', () => ({
  dbConfigured: true,
  sql: Object.assign(vi.fn(async () => []), { unsafe: vi.fn() }),
}));

let app: import('express').Express;

beforeAll(async () => {
  process.env.NODE_ENV = 'production';
  process.env.DATABASE_URL = 'postgres://test';
  process.env.ADMIN_API_KEY = 'secret';
  process.env.CORS_ORIGINS = 'https://allowed.example';
  app = (await import('../src/index')).default;
});

const auth = { Authorization: 'Bearer secret' };

describe('auth', () => {
  it('rejects missing and wrong tokens', async () => {
    await request(app).delete('/api/works/1').expect(401);
    await request(app).delete('/api/works/1').set('Authorization', 'Bearer nope').expect(401);
    await request(app).delete('/api/works/1').set('Authorization', 'secret').expect(401);
  });
});

describe('validation', () => {
  it('rejects non-numeric ids', async () => {
    await request(app).put('/api/works/abc').set(auth).send({}).expect(400);
  });

  it('rejects incomplete bodies', async () => {
    await request(app).post('/api/works').set(auth).send({ title: 'x' }).expect(400);
    await request(app).post('/api/portfolio').set(auth).send({}).expect(400);
  });

  it('rejects an empty reorder list', async () => {
    await request(app).patch('/api/works/reorder').set(auth).send({ ids: [] }).expect(400);
  });
});

describe('delete', () => {
  it('returns 404 when the row does not exist', async () => {
    await request(app).delete('/api/works/999').set(auth).expect(404);
  });
});

describe('cors', () => {
  it('only allows configured origins', async () => {
    const ok = await request(app).get('/').set('Origin', 'https://allowed.example');
    expect(ok.headers['access-control-allow-origin']).toBe('https://allowed.example');
    const bad = await request(app).get('/').set('Origin', 'https://evil.example');
    expect(bad.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('returns JSON 404 for unknown routes', async () => {
    await request(app).get('/nope').expect(404);
  });
});

describe('partial updates', () => {
  it('PATCH schema does not inject defaults for omitted fields', async () => {
    const { portfolioPatchSchema } = await import('../src/routes/portfolio');
    expect(portfolioPatchSchema.parse({ name: 'x' })).toEqual({ name: 'x' });
  });

  it('PATCH validates ids and field types', async () => {
    await request(app).patch('/api/portfolio/abc').set(auth).send({}).expect(400);
    await request(app).patch('/api/portfolio/1').set(auth).send({ highlight: 'yes' }).expect(400);
  });
});
