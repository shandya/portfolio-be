import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';

const sqlMock = vi.hoisted(() => vi.fn(async (..._args: unknown[]): Promise<unknown[]> => []));

vi.mock('../src/lib/db', () => ({
  dbConfigured: true,
  sql: Object.assign(sqlMock, { unsafe: vi.fn() }),
}));

let app: import('express').Express;

beforeAll(async () => {
  process.env.NODE_ENV = 'production';
  process.env.DATABASE_URL = 'postgres://test';
  process.env.ADMIN_API_KEY = 'secret';
  app = (await import('../src/index')).default;
});

beforeEach(() => {
  sqlMock.mockReset();
  sqlMock.mockImplementation(async () => []);
});

const auth = { Authorization: 'Bearer secret' };

describe('slugify', () => {
  it('normalizes titles into URL-safe slugs', async () => {
    const { slugify } = await import('../src/lib/slug');
    expect(slugify('Hello, World! 2026')).toBe('hello-world-2026');
    expect(slugify('  Café — déjà vu  ')).toBe('cafe-deja-vu');
    expect(slugify('!!!')).toBe('');
  });
});

describe('cleanPostHtml', () => {
  it('keeps headings and safe links, strips scripts and javascript: urls', async () => {
    const { cleanPostHtml } = await import('../src/lib/sanitize');
    const out = cleanPostHtml(
      '<h2>Hi</h2><a href="https://x.test">ok</a><a href="javascript:alert(1)">bad</a><script>alert(1)</script>',
    );
    expect(out).toContain('<h2>Hi</h2>');
    expect(out).toContain('<a href="https://x.test" rel="noopener noreferrer">ok</a>');
    expect(out).not.toContain('javascript:');
    expect(out).not.toContain('<script>');
  });
});

describe('posts: access', () => {
  it('requires auth for admin and write routes', async () => {
    await request(app).get('/api/posts/admin').expect(401);
    await request(app).post('/api/posts').send({ title: 'x' }).expect(401);
    await request(app).delete('/api/posts/1').expect(401);
  });

  it('requires auth to read a single post by id (drafts are private)', async () => {
    await request(app).get('/api/posts/1').expect(401);
    await request(app).get('/api/posts/abc').set(auth).expect(400);
    await request(app).get('/api/posts/1').set(auth).expect(404);
    sqlMock.mockImplementation(async () => [{ id: 1, status: 'draft' }]);
    const res = await request(app).get('/api/posts/1').set(auth).expect(200);
    expect(res.body.data.status).toBe('draft');
  });

  it('keeps /admin routed to the admin list, not /:id', async () => {
    await request(app).get('/api/posts/admin').set(auth).expect(200);
  });

  it('returns 404 for unknown or unpublished slugs', async () => {
    await request(app).get('/api/posts/slug/nope').expect(404);
  });
});

describe('posts: validation', () => {
  it('rejects a missing title, bad slug, bad status or bad cover url', async () => {
    await request(app).post('/api/posts').set(auth).send({}).expect(400);
    await request(app).post('/api/posts').set(auth).send({ title: 'X', slug: 'Bad Slug' }).expect(400);
    await request(app).post('/api/posts').set(auth).send({ title: 'X', status: 'live' }).expect(400);
    await request(app).post('/api/posts').set(auth).send({ title: 'X', cover_url: 'not a url' }).expect(400);
    await request(app).post('/api/posts').set(auth).send({ title: '!!!' }).expect(400);
  });

  it('generates the slug from the title when omitted', async () => {
    sqlMock.mockImplementation(async () => [{ id: 1 }]);
    await request(app).post('/api/posts').set(auth).send({ title: 'My First Post' }).expect(201);
    const insertArgs = sqlMock.mock.calls.find((c) => String(c[0]).includes('INSERT INTO posts'));
    expect(insertArgs).toBeDefined();
    expect(insertArgs!.slice(1)).toContain('my-first-post');
  });

  it('PATCH schema does not inject defaults', async () => {
    const { postPatchSchema } = await import('../src/routes/posts');
    expect(postPatchSchema.parse({ title: 'x' })).toEqual({ title: 'x' });
  });
});

describe('posts: conflicts', () => {
  it('returns 409 when the slug is already used', async () => {
    sqlMock.mockImplementation(async (strings: unknown) => {
      if (String(strings).includes('INSERT INTO posts')) {
        throw Object.assign(new Error('duplicate key'), { code: '23505' });
      }
      return [];
    });
    const res = await request(app).post('/api/posts').set(auth).send({ title: 'Dup', slug: 'dup' }).expect(409);
    expect(res.body.error).toBe('Slug already in use');
  });
});
