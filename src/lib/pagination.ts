import { Request } from 'express';

export function parsePageParams(query: Request['query']): { page: number; size: number } {
  const page = Math.max(1, parseInt(query.page as string) || 1);
  const size = Math.min(100, Math.max(1, parseInt(query.size as string) || 10));
  return { page, size };
}

export function buildMeta(page: number, size: number, total: number) {
  const totalPages = Math.ceil(total / size) || 1;
  return {
    currentPage: Math.min(Math.max(page, 1), totalPages),
    size,
    totalItems: total,
    totalPages,
  };
}
