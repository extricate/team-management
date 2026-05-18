/**
 * One-time data migration: seeds the "Niet beschikbaar" sentinel functie and migrates
 * existing positions (positions.type → positions.roltitel, functieId = niet-beschikbaar).
 *
 * Run after db:migrate:
 *   node --env-file=.env scripts/seed-functies.mjs
 */

import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL);

async function main() {
  // 1. Seed "Niet beschikbaar" sentinel (idempotent)
  const [sentinel] = await sql`
    INSERT INTO functies (titel, is_active)
    VALUES ('Niet beschikbaar', true)
    ON CONFLICT (titel) DO NOTHING
    RETURNING id, titel
  `;

  const [existing] = sentinel
    ? [sentinel]
    : await sql`SELECT id FROM functies WHERE titel = 'Niet beschikbaar'`;

  const nId = existing.id;
  console.log(`✓ "Niet beschikbaar" functie: ${nId}`);

  // 2. Migrate existing positions: copy type → roltitel, point functie_id to sentinel
  const { count } = await sql`
    UPDATE positions
    SET
      functie_id = ${nId},
      roltitel   = CASE WHEN type IS NOT NULL AND type != '' THEN type ELSE NULL END,
      updated_at = now()
    WHERE functie_id IS NULL
    RETURNING 1
  `.then(rows => ({ count: rows.length }));

  console.log(`✓ Migrated ${count} existing position(s) to "Niet beschikbaar" + roltitel`);

  await sql.end();
}

main().catch(e => { console.error(e); process.exit(1); });
