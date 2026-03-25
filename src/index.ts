import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import bodyParser from 'body-parser';
import { sql } from './lib/db';
import portfolioRouter from './routes/portfolio';
import worksRouter from './routes/works';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

// CORS
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// Preflight
app.options('*', (_req, res) => {
  res.sendStatus(204);
});

app.get("/", (_req: Request, res: Response) => {
  res.send("Express + TypeScript Server");
});

app.use('/api/portfolio', portfolioRouter);
app.use('/api/works', worksRouter);

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
