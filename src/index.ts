import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import bodyParser from 'body-parser';
import { neon } from '@neondatabase/serverless';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;
const sql = neon(process.env.DATABASE_URL!);

interface PaginatedResponse<T> {
  data: T[],
  meta: {
    currentPage: number,
    size: number,
    totalItems: number,
    totalPages: number
  }
}

function buildMeta(page: number, size: number, total: number): PaginatedResponse<never>['meta'] {
  const totalPages = Math.ceil(total / size) || 1;
  return { currentPage: Math.min(Math.max(page, 1), totalPages), size, totalItems: total, totalPages };
}

function parsePageParams(query: Request['query']): { page: number, size: number } {
  const page = Math.max(1, parseInt(query.page as string) || 1);
  const size = Math.min(100, Math.max(1, parseInt(query.size as string) || 10));
  return { page, size };
}

app.use(bodyParser.json());

// CORS
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.get("/", (_req: Request, res: Response) => {
  res.send("Express + TypeScript Server");
});

// GET /api/works?page=1&size=10&title=developer&company_name=BNI
app.get('/api/works', async (req: Request, res: Response) => {
  try {
    const { title, company_name } = req.query;
    const { page, size } = parsePageParams(req.query);
    const offset = (page - 1) * size;

    const titleParam = title ? `%${title}%` : '%';
    const companyParam = company_name ? `%${company_name}%` : '%';

    const [rows, countRows] = await Promise.all([
      sql`SELECT title, company_name, location, time, job_desc FROM works
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

// GET /api/portfolio?page=1&size=10&highlight=true&year=2024&client=BNI&tags=React
app.get('/api/portfolio', async (req: Request, res: Response) => {
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
      sql`SELECT name, tags, external_url, description, year, highlight, client, made_at FROM portfolio
          WHERE year ILIKE ${yearParam} AND client ILIKE ${clientParam} AND tags ILIKE ${tagsParam}
          ${highlightFilter}
          ORDER BY id ASC LIMIT ${size} OFFSET ${offset}`,
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
app.get('/api/portfolio/highlights', async (req: Request, res: Response) => {
  try {
    const { page, size } = parsePageParams(req.query);
    const offset = (page - 1) * size;

    const [rows, countRows] = await Promise.all([
      sql`SELECT name, tags, external_url, description, year, highlight, client, made_at FROM portfolio
          WHERE highlight = true ORDER BY id ASC LIMIT ${size} OFFSET ${offset}`,
      sql`SELECT COUNT(*)::int AS total FROM portfolio WHERE highlight = true`
    ]);

    const total = (countRows[0] as { total: number }).total;
    res.status(200).json({ data: rows, meta: buildMeta(page, size, total) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load portfolio data' });
  }
});

// GET /api/site
app.get('/api/site', async (_req: Request, res: Response) => {
  try {
    const rows = await sql`SELECT description FROM site`;
    res.status(200).json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load site data' });
  }
});

// For local dev
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
  });
}

export default app;
