import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;

/** False when DATABASE_URL is missing; the app then answers /api requests with a clear 503. */
export const dbConfigured = Boolean(url);

if (!dbConfigured) {
  console.error('[db] DATABASE_URL is not set. API routes will respond with 503 until it is configured.');
}

// A placeholder keeps module loading from crashing (Vercel would show a blank
// FUNCTION_INVOCATION_FAILED); queries never run while dbConfigured is false.
export const sql = neon(url ?? 'postgres://missing:missing@missing.invalid/missing');
