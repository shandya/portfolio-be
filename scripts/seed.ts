import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'path';

dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

async function seed() {
  console.log('Seeding database...');

  // Works
  const works = JSON.parse(await fs.readFile(path.join(process.cwd(), 'data/works.json'), 'utf8'));
  await sql`TRUNCATE works RESTART IDENTITY CASCADE`;
  for (const w of works) {
    await sql`INSERT INTO works (title, company_name, location, time, job_desc, sort_order)
              VALUES (${w.title}, ${w.company_name}, ${w.location}, ${w.time}, ${w.job_desc}, ${works.indexOf(w)})`;
  }
  console.log(`Inserted ${works.length} works`);

  // Portfolio
  const portfolio = JSON.parse(await fs.readFile(path.join(process.cwd(), 'data/portfolio.json'), 'utf8'));
  await sql`TRUNCATE portfolio RESTART IDENTITY CASCADE`;
  for (const p of portfolio) {
    await sql`INSERT INTO portfolio (name, tags, external_url, description, year, highlight, client, made_at, sort_order)
              VALUES (${p.name}, ${p.tags}, ${p.external_url}, ${p.description}, ${p.year}, ${p.highlight}, ${p.client}, ${p.made_at}, ${portfolio.indexOf(p)})`;
  }
  console.log(`Inserted ${portfolio.length} portfolio items`);

  // Site
  const site = JSON.parse(await fs.readFile(path.join(process.cwd(), 'data/site.json'), 'utf8'));
  await sql`TRUNCATE site RESTART IDENTITY CASCADE`;
  for (const s of site) {
    await sql`INSERT INTO site (description) VALUES (${s.description})`;
  }
  console.log(`Inserted ${site.length} site entries`);

  console.log('Seed complete.');
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
