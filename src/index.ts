import "dotenv/config";
import express, { Express, Request, Response, NextFunction } from "express";
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import portfolioRouter from './routes/portfolio';
import worksRouter from './routes/works';
import siteRouter from './routes/site';
import postsRouter from './routes/posts';

const app: Express = express();
const port = process.env.PORT || 3000;

// In development, fall back to the local Next.js dev server so the browser can reach the API
const defaultOrigins = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000';
const allowedOrigins = (process.env.CORS_ORIGINS ?? defaultOrigins)
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// Public read API: let browsers on other origins (see CORS below) consume responses
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(express.json({ limit: '1mb' })); // blog posts can be long

// CORS: restricted to CORS_ORIGINS (comma-separated). Unset = no cross-origin browser access.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  next();
});

// Preflight
app.options('*', (_req, res) => {
  res.sendStatus(204);
});

// Throttle repeated attempts (e.g. brute-forcing the admin key)
app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false }));

app.get("/", (_req: Request, res: Response) => {
  res.send("Express + TypeScript Server");
});

app.use('/api/portfolio', portfolioRouter);
app.use('/api/works', worksRouter);
app.use('/api/site', siteRouter);
app.use('/api/posts', postsRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error(`[error] ${req.method} ${req.originalUrl}:`, err);
  res.status(500).json({ error: 'Internal server error' });
});

// For local dev
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
  });
}

export default app;
