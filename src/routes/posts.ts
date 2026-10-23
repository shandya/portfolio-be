import { Router, Response } from 'express';
import { z } from 'zod';
import { sql } from '../lib/db';
import { requireAuth } from '../lib/auth';
import { parsePageParams, buildMeta } from '../lib/pagination';
import { cleanPostHtml } from '../lib/sanitize';
import { SLUG_PATTERN, slugify } from '../lib/slug';
import { asyncHandler, validateBody, validateId } from '../lib/http';

const router = Router();

const postFields = {
  slug: z.string().regex(SLUG_PATTERN, 'Use lowercase letters, numbers and single hyphens'),
  title: z.string().min(1),
  excerpt: z.string(),
  content: z.string().transform(cleanPostHtml),
  cover_url: z.union([z.literal(''), z.string().url()]),
  tags: z.string(),
  status: z.enum(['draft', 'published']),
};

// Full body (POST/PUT): slug is generated from the title when omitted or blank
const postSchema = z
  .object({
    ...postFields,
    slug: z.union([z.literal(''), postFields.slug]).optional(),
    excerpt: postFields.excerpt.default(''),
    content: z.string().default('').transform(cleanPostHtml),
    cover_url: postFields.cover_url.default(''),
    tags: postFields.tags.default(''),
    status: postFields.status.default('draft'),
  })
  .transform((post) => ({ ...post, slug: post.slug || slugify(post.title) }))
  .refine((post) => SLUG_PATTERN.test(post.slug), { message: 'Title must contain letters or numbers', path: ['slug'] });

// PATCH body: no defaults, so omitted fields are left untouched
export const postPatchSchema = z.object(postFields).partial();

const SUMMARY_COLUMNS = sql`id, slug, title, excerpt, cover_url, tags, status, published_at, created_at, updated_at`;
const ALL_COLUMNS = sql`id, slug, title, excerpt, content, cover_url, tags, status, published_at, created_at, updated_at`;

/** Returns true (and responds 409) when the error is a duplicate-slug unique violation. */
function handleSlugConflict(err: unknown, res: Response): boolean {
  if ((err as { code?: string })?.code === '23505') {
    res.status(409).json({ error: 'Slug already in use' });
    return true;
  }
  return false;
}

// GET /api/posts?page=1&size=10&tag=react&q=search  — published only
router.get('/', asyncHandler(async (req, res) => {
  const { tag, q } = req.query;
  const { page, size } = parsePageParams(req.query);
  const offset = (page - 1) * size;

  const tagFilter = tag ? sql`AND tags ILIKE ${`%${tag}%`}` : sql``;
  const searchFilter = q
    ? sql`AND (title ILIKE ${`%${q}%`} OR excerpt ILIKE ${`%${q}%`} OR tags ILIKE ${`%${q}%`})`
    : sql``;

  const [rows, countRows] = await Promise.all([
    sql`SELECT ${SUMMARY_COLUMNS} FROM posts
        WHERE status = 'published' ${tagFilter} ${searchFilter}
        ORDER BY published_at DESC, id DESC LIMIT ${size} OFFSET ${offset}`,
    sql`SELECT COUNT(*)::int AS total FROM posts WHERE status = 'published' ${tagFilter} ${searchFilter}`,
  ]);

  const total = (countRows[0] as { total: number }).total;
  res.status(200).json({ data: rows, meta: buildMeta(page, size, total) });
}));

// GET /api/posts/slug/:slug  — single published post
router.get('/slug/:slug', asyncHandler(async (req, res) => {
  const rows = await sql`SELECT ${ALL_COLUMNS} FROM posts WHERE slug = ${req.params.slug} AND status = 'published'`;
  if (rows.length === 0) {
    res.status(404).json({ error: 'Post not found' });
    return;
  }
  res.status(200).json({ data: rows[0] });
}));

// GET /api/posts/admin  — all posts including drafts (CMS)
router.get('/admin', requireAuth, asyncHandler(async (_req, res) => {
  const rows = await sql`SELECT ${ALL_COLUMNS} FROM posts ORDER BY COALESCE(published_at, created_at) DESC, id DESC`;
  res.status(200).json({ data: rows });
}));

// GET /api/posts/:id  — any post including drafts (CMS preview); must stay after /admin and /slug
router.get('/:id', requireAuth, validateId, asyncHandler(async (req, res) => {
  const rows = await sql`SELECT ${ALL_COLUMNS} FROM posts WHERE id = ${req.params.id}`;
  if (rows.length === 0) {
    res.status(404).json({ error: 'Post not found' });
    return;
  }
  res.status(200).json({ data: rows[0] });
}));

// POST /api/posts
router.post('/', requireAuth, validateBody(postSchema), asyncHandler(async (req, res) => {
  const { slug, title, excerpt, content, cover_url, tags, status } = req.body;
  try {
    const rows = await sql`
      INSERT INTO posts (slug, title, excerpt, content, cover_url, tags, status, published_at)
      VALUES (${slug}, ${title}, ${excerpt}, ${content}, ${cover_url}, ${tags}, ${status},
              CASE WHEN ${status}::text = 'published' THEN now() END)
      RETURNING ${ALL_COLUMNS}
    `;
    res.status(201).json({ data: rows[0] });
  } catch (err) {
    if (!handleSlugConflict(err, res)) throw err;
  }
}));

// PUT /api/posts/:id
router.put('/:id', requireAuth, validateId, validateBody(postSchema), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { slug, title, excerpt, content, cover_url, tags, status } = req.body;
  try {
    const rows = await sql`
      UPDATE posts
      SET slug=${slug}, title=${title}, excerpt=${excerpt}, content=${content},
          cover_url=${cover_url}, tags=${tags}, status=${status},
          published_at = CASE WHEN ${status}::text = 'published' THEN COALESCE(published_at, now()) ELSE published_at END,
          updated_at = now()
      WHERE id=${id}
      RETURNING ${ALL_COLUMNS}
    `;
    if (rows.length === 0) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }
    res.status(200).json({ data: rows[0] });
  } catch (err) {
    if (!handleSlugConflict(err, res)) throw err;
  }
}));

// PATCH /api/posts/:id  — partial update, only the fields sent are changed
router.patch('/:id', requireAuth, validateId, validateBody(postPatchSchema), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { slug, title, excerpt, content, cover_url, tags, status } = req.body;
  try {
    const rows = await sql`
      UPDATE posts
      SET slug = COALESCE(${slug ?? null}, slug),
          title = COALESCE(${title ?? null}, title),
          excerpt = COALESCE(${excerpt ?? null}, excerpt),
          content = COALESCE(${content ?? null}, content),
          cover_url = COALESCE(${cover_url ?? null}, cover_url),
          tags = COALESCE(${tags ?? null}, tags),
          status = COALESCE(${status ?? null}, status),
          published_at = CASE WHEN COALESCE(${status ?? null}::text, status) = 'published'
                              THEN COALESCE(published_at, now()) ELSE published_at END,
          updated_at = now()
      WHERE id=${id}
      RETURNING ${ALL_COLUMNS}
    `;
    if (rows.length === 0) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }
    res.status(200).json({ data: rows[0] });
  } catch (err) {
    if (!handleSlugConflict(err, res)) throw err;
  }
}));

// DELETE /api/posts/:id
router.delete('/:id', requireAuth, validateId, asyncHandler(async (req, res) => {
  const rows = await sql`DELETE FROM posts WHERE id=${req.params.id} RETURNING id`;
  if (rows.length === 0) {
    res.status(404).json({ error: 'Post not found' });
    return;
  }
  res.status(204).send();
}));

export default router;
