import { timingSafeEqual } from 'node:crypto';
import { Request, Response, NextFunction } from 'express';

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers['authorization'] ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const expected = process.env.ADMIN_API_KEY;
  if (!expected || !token || !safeEqual(token, expected)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}
