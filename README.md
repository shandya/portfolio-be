# portfolio-be

Express + TypeScript API for the portfolio site, backed by Neon Postgres and deployed on Vercel.

## Setup
1. `npm install`
2. Copy `env.example` to `.env` and fill in `DATABASE_URL`, `ADMIN_API_KEY`, `CORS_ORIGINS`.
3. Apply migrations: `npm run migrate` (runs `migrations/*.sql` in order, once each, tracked in `schema_migrations`).
4. Optional seed: `npm run seed` (truncates tables first).
5. `npm run dev`

## Scripts
`dev`, `build`, `start`, `typecheck`, `test`, `migrate`, `seed`

## API
Reads are public; writes need `Authorization: Bearer <ADMIN_API_KEY>`. Bodies are validated (zod); rich-text fields are sanitized.

| Method | Path | Notes |
|---|---|---|
| GET | `/api/portfolio` | `page, size, highlight, year, client, tags, q` |
| GET | `/api/portfolio/highlights` | `page, size` |
| POST / PUT / PATCH / DELETE | `/api/portfolio[/:id]` | auth; PATCH updates only the fields sent |
| PATCH | `/api/portfolio/reorder` | auth, `{ ids: number[] }` |
| GET | `/api/works` | `page, size, title, company_name` |
| POST / PUT / PATCH / DELETE | `/api/works[/:id]` | auth; PATCH updates only the fields sent |
| PATCH | `/api/works/reorder` | auth |
| GET | `/api/site` | |
| GET | `/api/posts` | published only; `page, size, tag, q`; no `content` |
| GET | `/api/posts/slug/:slug` | single published post, 404 for drafts |
| GET | `/api/posts/admin` | auth; all posts including drafts |
| POST / PUT / PATCH / DELETE | `/api/posts[/:id]` | auth; slug auto-generated from title when blank, 409 if taken |
