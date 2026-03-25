import { Router, Request, Response } from 'express';
import { sql } from '../lib/db';
import { requireAuth } from '../lib/auth';
import { parsePageParams, buildMeta } from '../lib/pagination';

const router = Router();

// GET /api/works?page=1&size=10&title=developer&company_name=BNI
router.get('/', async (req: Request, res: Response) => {
  try {
    const { title, company_name } = req.query;
    const { page, size } = parsePageParams(req.query);
    const offset = (page - 1) * size;

    const titleParam = title ? `%${title}%` : '%';
    const companyParam = company_name ? `%${company_name}%` : '%';

    const [rows, countRows] = await Promise.all([
      sql`SELECT id, title, company_name, location, time, job_desc FROM works
          WHERE title ILIKE ${titleParam} AND company_name ILIKE ${companyParam}
          ORDER BY id ASC LIMIT ${size} OFFSET ${offset}`,
      sql`SELECT COUNT(*)::int AS total FROM works
          WHERE title ILIKE ${titleParam} AND company_name ILIKE ${companyParam}`
    ]);

    const total = (countRows[0] as { total: number }).total;
    res.status(200).json({ data: rows, meta: buildMeta(page, size, total) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load works data' });
  }
});

// POST /api/works
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { title, company_name, location, time, job_desc } = req.body;
    const rows = await sql`
      INSERT INTO works (title, company_name, location, time, job_desc)
      VALUES (${title}, ${company_name}, ${location}, ${time}, ${job_desc})
      RETURNING id, title, company_name, location, time, job_desc
    `;
    res.status(201).json({ data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create work item' });
  }
});

// PUT /api/works/:id
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
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
  } catch (err) {
    res.status(500).json({ error: 'Failed to update work item' });
  }
});

// DELETE /api/works/:id
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await sql`DELETE FROM works WHERE id=${id}`;
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete work item' });
  }
});

export default router;
