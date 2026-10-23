import { Router } from 'express';
import { z } from 'zod';
import { sql } from '../lib/db';
import { requireAuth } from '../lib/auth';
import { parsePageParams, buildMeta } from '../lib/pagination';
import { cleanHtml } from '../lib/sanitize';
import { asyncHandler, validateBody, validateId, reorderSchema } from '../lib/http';

const router = Router();

const portfolioFields = {
  name: z.string().min(1),
  tags: z.string(),
  external_url: z.string(),
  description: z.string().transform(cleanHtml),
  year: z.string().min(1),
  highlight: z.boolean(),
  client: z.string(),
  made_at: z.string(),
};

// Full body (POST/PUT): optional text fields fall back to empty, highlight to false
const portfolioSchema = z.object({
  ...portfolioFields,
  tags: portfolioFields.tags.default(''),
  external_url: portfolioFields.external_url.default(''),
  description: z.string().default('').transform(cleanHtml),
  highlight: portfolioFields.highlight.default(false),
  client: portfolioFields.client.default(''),
  made_at: portfolioFields.made_at.default(''),
});

// PATCH body: no defaults, so omitted fields are left untouched
export const portfolioPatchSchema = z.object(portfolioFields).partial();

// GET /api/portfolio?page=1&size=10&highlight=true&year=2024&client=BNI&tags=React&q=search
router.get('/', asyncHandler(async (req, res) => {
  const { highlight, year, client, tags, q } = req.query;
  const { page, size } = parsePageParams(req.query);
  const offset = (page - 1) * size;

  const yearFilter = year ? sql`AND year ILIKE ${`%${year}%`}` : sql``;
  const clientFilter = client ? sql`AND client ILIKE ${`%${client}%`}` : sql``;
  const tagsFilter = tags ? sql`AND tags ILIKE ${`%${tags}%`}` : sql``;
  const searchFilter = q
    ? sql`AND (name ILIKE ${`%${q}%`} OR tags ILIKE ${`%${q}%`} OR client ILIKE ${`%${q}%`})`
    : sql``;
  const highlightFilter = highlight !== undefined
    ? sql`AND highlight = ${highlight === 'true'}`
    : sql``;

  const [rows, countRows] = await Promise.all([
    sql`SELECT id, name, tags, external_url, description, year, highlight, client, made_at FROM portfolio
        WHERE TRUE ${yearFilter} ${clientFilter} ${tagsFilter} ${searchFilter} ${highlightFilter}
        ORDER BY sort_order ASC, id ASC LIMIT ${size} OFFSET ${offset}`,
    sql`SELECT COUNT(*)::int AS total FROM portfolio
        WHERE TRUE ${yearFilter} ${clientFilter} ${tagsFilter} ${searchFilter} ${highlightFilter}`,
  ]);

  const total = (countRows[0] as { total: number }).total;
  res.status(200).json({ data: rows, meta: buildMeta(page, size, total) });
}));

// GET /api/portfolio/highlights?page=1&size=10
router.get('/highlights', asyncHandler(async (req, res) => {
  const { page, size } = parsePageParams(req.query);
  const offset = (page - 1) * size;

  const [rows, countRows] = await Promise.all([
    sql`SELECT id, name, tags, external_url, description, year, highlight, client, made_at FROM portfolio
        WHERE highlight = true ORDER BY sort_order ASC, id ASC LIMIT ${size} OFFSET ${offset}`,
    sql`SELECT COUNT(*)::int AS total FROM portfolio WHERE highlight = true`,
  ]);

  const total = (countRows[0] as { total: number }).total;
  res.status(200).json({ data: rows, meta: buildMeta(page, size, total) });
}));

// POST /api/portfolio
router.post('/', requireAuth, validateBody(portfolioSchema), asyncHandler(async (req, res) => {
  const { name, tags, external_url, description, year, highlight, client, made_at } = req.body;
  const rows = await sql`
    INSERT INTO portfolio (name, tags, external_url, description, year, highlight, client, made_at, sort_order)
    VALUES (${name}, ${tags}, ${external_url}, ${description}, ${year}, ${highlight}, ${client}, ${made_at},
            (SELECT COALESCE(MAX(sort_order) + 1, 0) FROM portfolio))
    RETURNING id, name, tags, external_url, description, year, highlight, client, made_at
  `;
  res.status(201).json({ data: rows[0] });
}));

// PATCH /api/portfolio/reorder  — must be before PUT /:id
router.patch('/reorder', requireAuth, validateBody(reorderSchema), asyncHandler(async (req, res) => {
  const { ids } = req.body as { ids: number[] };
  await sql`
    UPDATE portfolio p SET sort_order = c.ord - 1
    FROM unnest(${ids}::int[]) WITH ORDINALITY AS c(id, ord)
    WHERE p.id = c.id
  `;
  res.status(200).json({ ok: true });
}));

// PUT /api/portfolio/:id
router.put('/:id', requireAuth, validateId, validateBody(portfolioSchema), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, tags, external_url, description, year, highlight, client, made_at } = req.body;
  const rows = await sql`
    UPDATE portfolio
    SET name=${name}, tags=${tags}, external_url=${external_url}, description=${description},
        year=${year}, highlight=${highlight}, client=${client}, made_at=${made_at}
    WHERE id=${id}
    RETURNING id, name, tags, external_url, description, year, highlight, client, made_at
  `;
  if (rows.length === 0) {
    res.status(404).json({ error: 'Portfolio item not found' });
    return;
  }
  res.status(200).json({ data: rows[0] });
}));

// PATCH /api/portfolio/:id  — partial update, only the fields sent are changed
router.patch('/:id', requireAuth, validateId, validateBody(portfolioPatchSchema), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, tags, external_url, description, year, highlight, client, made_at } = req.body;
  const rows = await sql`
    UPDATE portfolio
    SET name = COALESCE(${name ?? null}, name),
        tags = COALESCE(${tags ?? null}, tags),
        external_url = COALESCE(${external_url ?? null}, external_url),
        description = COALESCE(${description ?? null}, description),
        year = COALESCE(${year ?? null}, year),
        highlight = COALESCE(${highlight ?? null}, highlight),
        client = COALESCE(${client ?? null}, client),
        made_at = COALESCE(${made_at ?? null}, made_at)
    WHERE id=${id}
    RETURNING id, name, tags, external_url, description, year, highlight, client, made_at
  `;
  if (rows.length === 0) {
    res.status(404).json({ error: 'Portfolio item not found' });
    return;
  }
  res.status(200).json({ data: rows[0] });
}));

// DELETE /api/portfolio/:id
router.delete('/:id', requireAuth, validateId, asyncHandler(async (req, res) => {
  const rows = await sql`DELETE FROM portfolio WHERE id=${req.params.id} RETURNING id`;
  if (rows.length === 0) {
    res.status(404).json({ error: 'Portfolio item not found' });
    return;
  }
  res.status(204).send();
}));

export default router;
