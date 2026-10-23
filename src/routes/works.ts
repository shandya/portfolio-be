import { Router } from 'express';
import { z } from 'zod';
import { sql } from '../lib/db';
import { requireAuth } from '../lib/auth';
import { parsePageParams, buildMeta } from '../lib/pagination';
import { cleanHtml } from '../lib/sanitize';
import { asyncHandler, validateBody, validateId, reorderSchema } from '../lib/http';

const router = Router();

const workSchema = z.object({
  title: z.string().min(1),
  company_name: z.string().min(1),
  location: z.string().min(1),
  time: z.string().min(1),
  job_desc: z.string().min(1).transform(cleanHtml),
});

// GET /api/works?page=1&size=10&title=developer&company_name=BNI
router.get('/', asyncHandler(async (req, res) => {
  const { title, company_name } = req.query;
  const { page, size } = parsePageParams(req.query);
  const offset = (page - 1) * size;

  const titleFilter = title ? sql`AND title ILIKE ${`%${title}%`}` : sql``;
  const companyFilter = company_name ? sql`AND company_name ILIKE ${`%${company_name}%`}` : sql``;

  const [rows, countRows] = await Promise.all([
    sql`SELECT id, title, company_name, location, time, job_desc FROM works
        WHERE TRUE ${titleFilter} ${companyFilter}
        ORDER BY sort_order ASC, id ASC LIMIT ${size} OFFSET ${offset}`,
    sql`SELECT COUNT(*)::int AS total FROM works WHERE TRUE ${titleFilter} ${companyFilter}`,
  ]);

  const total = (countRows[0] as { total: number }).total;
  res.status(200).json({ data: rows, meta: buildMeta(page, size, total) });
}));

// POST /api/works
router.post('/', requireAuth, validateBody(workSchema), asyncHandler(async (req, res) => {
  const { title, company_name, location, time, job_desc } = req.body;
  const rows = await sql`
    INSERT INTO works (title, company_name, location, time, job_desc, sort_order)
    VALUES (${title}, ${company_name}, ${location}, ${time}, ${job_desc},
            (SELECT COALESCE(MAX(sort_order) + 1, 0) FROM works))
    RETURNING id, title, company_name, location, time, job_desc
  `;
  res.status(201).json({ data: rows[0] });
}));

// PATCH /api/works/reorder  — must be before PUT /:id
router.patch('/reorder', requireAuth, validateBody(reorderSchema), asyncHandler(async (req, res) => {
  const { ids } = req.body as { ids: number[] };
  await sql`
    UPDATE works w SET sort_order = c.ord - 1
    FROM unnest(${ids}::int[]) WITH ORDINALITY AS c(id, ord)
    WHERE w.id = c.id
  `;
  res.status(200).json({ ok: true });
}));

// PUT /api/works/:id
router.put('/:id', requireAuth, validateId, validateBody(workSchema), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, company_name, location, time, job_desc } = req.body;
  const rows = await sql`
    UPDATE works
    SET title=${title}, company_name=${company_name}, location=${location},
        time=${time}, job_desc=${job_desc}
    WHERE id=${id}
    RETURNING id, title, company_name, location, time, job_desc
  `;
  if (rows.length === 0) {
    res.status(404).json({ error: 'Work item not found' });
    return;
  }
  res.status(200).json({ data: rows[0] });
}));

// PATCH /api/works/:id  — partial update, only the fields sent are changed
router.patch('/:id', requireAuth, validateId, validateBody(workSchema.partial()), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, company_name, location, time, job_desc } = req.body;
  const rows = await sql`
    UPDATE works
    SET title = COALESCE(${title ?? null}, title),
        company_name = COALESCE(${company_name ?? null}, company_name),
        location = COALESCE(${location ?? null}, location),
        time = COALESCE(${time ?? null}, time),
        job_desc = COALESCE(${job_desc ?? null}, job_desc)
    WHERE id=${id}
    RETURNING id, title, company_name, location, time, job_desc
  `;
  if (rows.length === 0) {
    res.status(404).json({ error: 'Work item not found' });
    return;
  }
  res.status(200).json({ data: rows[0] });
}));

// DELETE /api/works/:id
router.delete('/:id', requireAuth, validateId, asyncHandler(async (req, res) => {
  const rows = await sql`DELETE FROM works WHERE id=${req.params.id} RETURNING id`;
  if (rows.length === 0) {
    res.status(404).json({ error: 'Work item not found' });
    return;
  }
  res.status(204).send();
}));

export default router;
