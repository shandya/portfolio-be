// Loads the compiled app with require() of ES modules disabled, which is how Vercel's Node runtime behaves.
// Catches ESM-only dependencies (ERR_REQUIRE_ESM) that work on a newer local Node but crash in production.
// Run after `npm run build`: npm run check:load
const { spawnSync } = require('node:child_process');

const result = spawnSync(
  process.execPath,
  [
    '--no-experimental-require-module',
    '-e',
    "require('./dist/index.js'); console.log('dist/index.js loads without require(esm)')",
  ],
  {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production', DATABASE_URL: process.env.DATABASE_URL || 'postgres://x:x@localhost/x' },
  },
);

process.exit(result.status ?? 1);
