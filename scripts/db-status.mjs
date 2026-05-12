/**
 * db-status: shows which Drizzle migrations are applied vs pending.
 *
 * Run via: npm run db:status
 *
 * Useful when drizzle-kit migrate gives no output and you cannot tell
 * whether migrations ran or were already up-to-date.
 */

import postgres from "postgres";
import { createHash } from "crypto";
import { readFileSync, existsSync } from "fs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("ERROR: DATABASE_URL is not set. Did you forget --env-file?");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });

async function main() {
  // Fetch recorded hashes from the DB
  let recorded;
  try {
    recorded = await sql`SELECT hash FROM drizzle.__drizzle_migrations ORDER BY created_at`;
  } catch (e) {
    console.error(
      "ERROR: Could not query drizzle.__drizzle_migrations.\n" +
      "Is the database reachable and has at least one migration been run?\n",
      e.message,
    );
    await sql.end();
    process.exit(1);
  }

  const recordedHashes = new Set(recorded.map((r) => r.hash));

  // Read journal
  const journalPath = "./drizzle/meta/_journal.json";
  if (!existsSync(journalPath)) {
    console.error("ERROR: drizzle/meta/_journal.json not found. Is this the project root?");
    await sql.end();
    process.exit(1);
  }

  const journal = JSON.parse(readFileSync(journalPath, "utf8"));
  const entries = journal.entries ?? [];

  if (entries.length === 0) {
    console.log("No migrations in journal.");
    await sql.end();
    return;
  }

  let pending = 0;
  let applied = 0;

  console.log("\nDrizzle migration status\n" + "─".repeat(52));

  for (const entry of entries) {
    const filePath = `./drizzle/${entry.tag}.sql`;
    if (!existsSync(filePath)) {
      console.log(`  [MISSING] ${entry.tag}  ← SQL file not found!`);
      pending++;
      continue;
    }

    const content = readFileSync(filePath, "utf8");
    const hash = createHash("sha256").update(content).digest("hex");
    const isApplied = recordedHashes.has(hash);

    if (isApplied) {
      console.log(`  [OK     ] ${entry.tag}`);
      applied++;
    } else {
      console.log(`  [PENDING] ${entry.tag}  ← not yet applied`);
      pending++;
    }
  }

  console.log("─".repeat(52));
  console.log(`  ${applied} applied, ${pending} pending\n`);

  if (pending > 0) {
    console.log("Run: npm run db:migrate   (stop the dev server first!)\n");
    await sql.end();
    process.exit(1); // non-zero exit so CI/hooks can detect it
  }

  await sql.end();
}

main().catch((e) => {
  console.error("Unexpected error:", e);
  process.exit(1);
});
