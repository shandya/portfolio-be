import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';

dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

// Applies migrations/*.sql in filename order, once each (tracked in schema_migrations).
async function migrate() {
  await sql`CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
  const applied = new Set(
    (await sql`SELECT name FROM schema_migrations`).map((r) => (r as { name: string }).name),
  );

  const dir = path.join(process.cwd(), 'migrations');
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const statements = (await fs.readFile(path.join(dir, file), 'utf8'))
      .split(/;\s*(?:\r?\n|$)/)
      .map((s) => s.trim())
      .filter(Boolean);
    // One HTTP transaction per file so a failing migration leaves nothing half-applied
    await sql.transaction([
      ...statements.map((s) => sql.query(s)),
      sql`INSERT INTO schema_migrations (name) VALUES (${file})`,
    ]);
    console.log(`Applied ${file}`);
  }
  console.log('Migrations up to date.');
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
