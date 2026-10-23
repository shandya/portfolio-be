ALTER TABLE portfolio ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE works     ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- Preserve current insertion order, only where ordering was never set
UPDATE portfolio SET sort_order = id WHERE NOT EXISTS (SELECT 1 FROM portfolio WHERE sort_order <> 0);
UPDATE works     SET sort_order = id WHERE NOT EXISTS (SELECT 1 FROM works WHERE sort_order <> 0);
