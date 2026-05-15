/**
 * db:reset — drops all tables and re-runs all migrations from scratch.
 *
 * Safety guard: only runs when NODE_ENV or ENV is "development" or "local".
 * Pass --force to override (e.g. for CI pipelines on a test database).
 *
 * Run via: npm run db:reset
 * Force:   npm run db:reset -- --force
 */

import postgres from "postgres";
import { Meilisearch } from "meilisearch";
import { execSync } from "child_process";

const INDEXES = ["employees", "teams", "organisations", "financial-sources", "positions"];

const ALLOWED_ENVS = new Set(["development", "local"]);
const env = process.env.NODE_ENV || process.env.ENV || "";
const force = process.argv.includes("--force");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("ERROR: DATABASE_URL is not set. Did you forget --env-file?");
  process.exit(1);
}

if (!force && !ALLOWED_ENVS.has(env)) {
  console.error(
    `ERROR: db:reset is only allowed in a development or local environment.\n` +
    `       Current NODE_ENV / ENV: "${env || "(not set)"}"\n\n` +
    `       To override:\n` +
    `         npm run db:reset -- --force\n`,
  );
  process.exit(1);
}

const sql = postgres(url, { max: 1 });

async function main() {
  console.log("\ndb:reset — all data will be destroyed.\n");

  if (force && !ALLOWED_ENVS.has(env)) {
    console.warn(`  WARNING: forcing reset on env="${env || "(not set)"}\n`);
  }

  console.log("  Dropping public and drizzle schemas...");
  await sql.unsafe(`
    DROP SCHEMA IF EXISTS drizzle CASCADE;
    DROP SCHEMA public CASCADE;
    CREATE SCHEMA public;
    GRANT ALL ON SCHEMA public TO PUBLIC;
  `);
  await sql.end();
  console.log("  Done.\n");

  console.log("  Clearing Meilisearch indexes...");
  const meili = new Meilisearch({
    host: process.env.MEILISEARCH_HOST ?? "http://localhost:7700",
    apiKey: process.env.MEILISEARCH_KEY ?? "teambeheer_search_key",
  });
  await Promise.all(INDEXES.map(idx => meili.deleteIndex(idx).catch(() => {})));
  console.log("  Done.\n");

  console.log("  Running migrations...");
  execSync("npm run db:migrate", { stdio: "inherit" });

  console.log("\ndb:reset complete. Run npm run db:seed to populate seed data.\n");
}

main().catch((e) => {
  console.error("Unexpected error:", e);
  process.exit(1);
});
