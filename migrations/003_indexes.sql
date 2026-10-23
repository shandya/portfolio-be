CREATE INDEX IF NOT EXISTS idx_works_sort ON works (sort_order, id);
CREATE INDEX IF NOT EXISTS idx_portfolio_sort ON portfolio (sort_order, id);
CREATE INDEX IF NOT EXISTS idx_portfolio_highlight ON portfolio (highlight) WHERE highlight;
