/**
 * Data migration: decouple positions from teams.
 *
 * Runs AFTER drizzle migration 0005 (which adds organisation_id nullable + coupling table).
 * Runs BEFORE drizzle migration 0006 (which makes organisation_id NOT NULL + drops team_id).
 *
 * Steps:
 * 1. Populate positions.organisation_id from teams.organisation_id
 * 2. Backfill team_position_couplings from existing positions.team_id
 * 3. Rename legacy status values to Dutch equivalents
 */

import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL);

async function run() {
  console.log("Step 1: Populating positions.organisation_id from teams…");
  const { count: orgCount } = await sql`
    UPDATE positions p
    SET organisation_id = t.organisation_id
    FROM teams t
    WHERE t.id = p.team_id
      AND p.organisation_id IS NULL
    RETURNING p.id
  `.then((rows) => ({ count: rows.length }));
  console.log(`  → ${orgCount} rows updated`);

  const unresolved = await sql`
    SELECT COUNT(*) AS n FROM positions WHERE organisation_id IS NULL AND deleted_at IS NULL
  `;
  if (Number(unresolved[0].n) > 0) {
    throw new Error(`${unresolved[0].n} non-deleted positions still have no organisation_id — aborting`);
  }

  console.log("Step 2: Backfilling team_position_couplings from positions.team_id…");
  const { count: couplingCount } = await sql`
    INSERT INTO team_position_couplings (id, team_id, position_id, start_date, created_at, updated_at)
    SELECT gen_random_uuid(), team_id, id, created_at, now(), now()
    FROM positions
    WHERE team_id IS NOT NULL
      AND deleted_at IS NULL
    ON CONFLICT DO NOTHING
    RETURNING id
  `.then((rows) => ({ count: rows.length }));
  console.log(`  → ${couplingCount} couplings created`);

  console.log("Step 3: Renaming legacy status values…");
  const renames = [
    ["planned", "gepland"],
    ["filled",  "gevuld"],
    ["closed",  "gesloten"],
  ];
  for (const [from, to] of renames) {
    const rows = await sql`
      UPDATE positions SET status = ${to} WHERE status = ${from} RETURNING id
    `;
    console.log(`  → '${from}' → '${to}': ${rows.length} rows`);
  }

  console.log("\nData migration complete.");
  await sql.end();
}

run().catch((err) => {
  console.error("Migration failed:", err.message);
  sql.end().finally(() => process.exit(1));
});
