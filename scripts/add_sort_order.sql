ALTER TABLE portfolio ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE works    ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- Initialize: preserve current insertion order
UPDATE portfolio SET sort_order = id;
UPDATE works    SET sort_order = id;
