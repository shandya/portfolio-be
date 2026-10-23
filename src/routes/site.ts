import { Router } from 'express';
import { sql } from '../lib/db';
import { asyncHandler } from '../lib/http';

const router = Router();

// GET /api/site
router.get('/', asyncHandler(async (_req, res) => {
  const rows = await sql`SELECT description FROM site`;
  res.status(200).json({ data: rows });
}));

export default router;
