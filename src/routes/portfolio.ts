import { Router, Request, Response } from 'express';
import { sql } from '../lib/db';
import { requireAuth } from '../lib/auth';
import { parsePageParams, buildMeta } from '../lib/pagination';

const router = Router();

// GET /api/portfolio?page=1&size=10&highlight=true&year=2024&client=BNI&tags=React
router.get('/', async (req: Request, res: Response) => {
  try {
    const { highlight, year, client, tags } = req.query;
    const { page, size } = parsePageParams(req.query);
    const offset = (page - 1) * size;

    const yearParam = year ? `%${year}%` : '%';
    const clientParam = client ? `%${client}%` : '%';
    const tagsParam = tags ? `%${tags}%` : '%';
    const highlightFilter = highlight !== undefined
      ? sql`AND highlight = ${highlight === 'true'}`
      : sql``;

    const [rows, countRows] = await Promise.all([
      sql`SELECT id, name, tags, external_url, description, year, highlight, client, made_at FROM portfolio
          WHERE year ILIKE ${yearParam} AND client ILIKE ${clientParam} AND tags ILIKE ${tagsParam}
          ${highlightFilter}
          ORDER BY sort_order ASC, id ASC LIMIT ${size} OFFSET ${offset}`,
      sql`SELECT COUNT(*)::int AS total FROM portfolio
          WHERE year ILIKE ${yearParam} AND client ILIKE ${clientParam} AND tags ILIKE ${tagsParam}
          ${highlightFilter}`
    ]);

    const total = (countRows[0] as { total: number }).total;
    res.status(200).json({ data: rows, meta: buildMeta(page, size, total) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load portfolio data' });
  }
});

// GET /api/portfolio/highlights?page=1&size=10
router.get('/highlights', async (req: Request, res: Response) => {
  try {
    const { page, size } = parsePageParams(req.query);
    const offset = (page - 1) * size;

    const [rows, countRows] = await Promise.all([
      sql`SELECT id, name, tags, external_url, description, year, highlight, client, made_at FROM portfolio
          WHERE highlight = true ORDER BY sort_order ASC, id ASC LIMIT ${size} OFFSET ${offset}`,
      sql`SELECT COUNT(*)::int AS total FROM portfolio WHERE highlight = true`
    ]);

    const total = (countRows[0] as { total: number }).total;
    res.status(200).json({ data: rows, meta: buildMeta(page, size, total) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load portfolio data' });
  }
});

// POST /api/portfolio
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, tags, external_url, description, year, highlight, client, made_at } = req.body;
    const rows = await sql`
      INSERT INTO portfolio (name, tags, external_url, description, year, highlight, client, made_at)
      VALUES (${name}, ${tags}, ${external_url}, ${description}, ${year}, ${highlight ?? false}, ${client}, ${made_at})
      RETURNING id, name, tags, external_url, description, year, highlight, client, made_at
    `;
    res.status(201).json({ data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create portfolio item' });
  }
});

// PATCH /api/portfolio/reorder  — must be before PUT /:id
router.patch('/reorder', requireAuth, async (req: Request, res: Response) => {
  try {
    const { ids } = req.body as { ids: number[] };
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: 'ids array is required' }); return;
    }
    const values = ids.map((id, index) => `(${Number(id)}, ${index})`).join(', ');
    await sql.unsafe(
      `UPDATE portfolio p SET sort_order = c.sort_order FROM (VALUES ${values}) AS c(id, sort_order) WHERE p.id = c.id`
    );
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reorder portfolio' });
  }
});

// PUT /api/portfolio/:id
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, tags, external_url, description, year, highlight, client, made_at } = req.body;
    const rows = await sql`
      UPDATE portfolio
      SET name=${name}, tags=${tags}, external_url=${external_url}, description=${description},
          year=${year}, highlight=${highlight ?? false}, client=${client}, made_at=${made_at}
      WHERE id=${id}
      RETURNING id, name, tags, external_url, description, year, highlight, client, made_at
    `;
    if (rows.length === 0) {
      res.status(404).json({ error: 'Portfolio item not found' });
      return;
    }
    res.status(200).json({ data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update portfolio item' });
  }
});

// DELETE /api/portfolio/:id
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await sql`DELETE FROM portfolio WHERE id=${id}`;
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete portfolio item' });
  }
});

export default router;
