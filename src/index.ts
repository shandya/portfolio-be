import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import fs from 'node:fs/promises';
import bodyParser from 'body-parser';
import path from 'path';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

interface Works {
  title: string,
  company_name: string,
  location: string,
  time: string,
  job_desc: string
}

interface Portfolio {
  name: string,
  tags: string,
  external_url: string,
  description: string,
  year: string,
  highlight: boolean,
  client: string,
  made_at: string
}

interface PaginatedResponse<T> {
  data: T[],
  meta: {
    currentPage: number,
    size: number,
    totalItems: number,
    totalPages: number
  }
}

function paginate<T>(items: T[], page: number, size: number): PaginatedResponse<T> {
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / size);
  const currentPage = Math.min(Math.max(page, 1), totalPages || 1);
  const data = items.slice((currentPage - 1) * size, currentPage * size);

  return {
    data,
    meta: { currentPage, size, totalItems, totalPages }
  };
}

function parsePageParams(query: Request['query']): { page: number, size: number } {
  const page = Math.max(1, parseInt(query.page as string) || 1);
  const size = Math.min(100, Math.max(1, parseInt(query.size as string) || 10));
  return { page, size };
}

app.use(bodyParser.json());

// CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.get("/", (req: Request, res: Response) => {
  res.send("Express + TypeScript Server");
});

// GET /api/works?page=1&size=10&title=developer&company_name=BNI
app.get('/api/works', async (req: Request, res: Response) => {
  try {
    const fileContent = await fs.readFile(path.join(process.cwd(), '/data/works.json'), 'utf8');
    let data: Works[] = JSON.parse(fileContent);

    const { title, company_name } = req.query;
    if (title) data = data.filter(w => w.title.toLowerCase().includes((title as string).toLowerCase()));
    if (company_name) data = data.filter(w => w.company_name.toLowerCase().includes((company_name as string).toLowerCase()));

    const { page, size } = parsePageParams(req.query);
    res.status(200).json(paginate(data, page, size));
  } catch (err) {
    res.status(500).json({ error: 'Failed to load works data' });
  }
});

// GET /api/portfolio?page=1&size=10&highlight=true&year=2024&client=BNI&tags=React
app.get('/api/portfolio', async (req: Request, res: Response) => {
  try {
    const fileContent = await fs.readFile(path.join(process.cwd(), '/data/portfolio.json'), 'utf8');
    let data: Portfolio[] = JSON.parse(fileContent);

    const { highlight, year, client, tags } = req.query;
    if (highlight !== undefined) data = data.filter(p => p.highlight === (highlight === 'true'));
    if (year) data = data.filter(p => p.year.includes(year as string));
    if (client) data = data.filter(p => p.client.toLowerCase().includes((client as string).toLowerCase()));
    if (tags) data = data.filter(p => p.tags.toLowerCase().includes((tags as string).toLowerCase()));

    const { page, size } = parsePageParams(req.query);
    res.status(200).json(paginate(data, page, size));
  } catch (err) {
    res.status(500).json({ error: 'Failed to load portfolio data' });
  }
});

// GET /api/site — no pagination, single config object
app.get('/api/site', async (req: Request, res: Response) => {
  try {
    const fileContent = await fs.readFile(path.join(process.cwd(), '/data/site.json'), 'utf8');
    const siteData = JSON.parse(fileContent);
    res.status(200).json({ data: siteData });
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
