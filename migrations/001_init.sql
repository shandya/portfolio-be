CREATE TABLE IF NOT EXISTS works (
  id           SERIAL PRIMARY KEY,
  title        TEXT NOT NULL,
  company_name TEXT NOT NULL,
  location     TEXT NOT NULL,
  time         TEXT NOT NULL,
  job_desc     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS portfolio (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  tags         TEXT NOT NULL DEFAULT '',
  external_url TEXT NOT NULL DEFAULT '',
  description  TEXT NOT NULL DEFAULT '',
  year         TEXT NOT NULL,
  highlight    BOOLEAN NOT NULL DEFAULT FALSE,
  client       TEXT NOT NULL DEFAULT '',
  made_at      TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS site (
  id          SERIAL PRIMARY KEY,
  description TEXT NOT NULL
);
