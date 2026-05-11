# Team Management — Claude Instructions

## Tech stack

Next.js 16, Drizzle ORM + drizzle-kit, PostgreSQL 16, NextAuth v5, Meilisearch. Dutch government org (~700 employees). UI language is Dutch.

## Dev environment

Start everything with one command:

```bash
npm run dev:start
```

This runs `docker compose up -d --wait db && npm run db:migrate && next dev` in sequence. **Never start the dev server before migrations have run.** If the dev server is running when you run `npm run db:migrate`, the `ALTER TABLE` statements will hang indefinitely waiting for Postgres locks held by the connection pool.

If you need to run migrations mid-session, stop the dev server first (`Ctrl+C`), then:

```bash
npm run db:migrate
npm run dev
```

## Database / Drizzle

### The only correct flow for schema changes

1. Edit `lib/db/schema.ts`
2. `npm run db:generate` — drizzle-kit diffs the schema against the latest snapshot and writes a new SQL file + snapshot into `drizzle/`
3. Review the generated SQL in `drizzle/`
4. `npm run db:migrate` (or just use `npm run dev:start` which runs it automatically)

### Hard rules — never break these

- **Never manually edit files in `drizzle/meta/`** (`_journal.json`, snapshot `.json` files). These are drizzle-kit's internal state. Editing them by hand corrupts the migration chain.
- **Never manually create or edit migration SQL files** in `drizzle/`. Always let `drizzle-kit generate` produce them.
- **Never delete snapshot files.** `drizzle-kit generate` reads the latest snapshot to compute what changed. Deleting one breaks all future generations.

### If `drizzle-kit migrate` silently fails (exit code 1, spinner never clears)

It is not hanging — it fails silently. Diagnose by running each pending SQL manually:

```js
// node --env-file=.env --env-file=.env.local --input-type=module
import postgres from 'postgres';
import { readFileSync } from 'fs';
const sql = postgres(process.env.DATABASE_URL);
const content = readFileSync('./drizzle/<migration>.sql', 'utf8');
await sql.unsafe(content); // shows the real error
```

Common causes:
- **Column/table already exists**: schema was applied out-of-band (via `drizzle-kit push` or manual SQL) without recording the migration. Fix: compute SHA256 of the SQL file and insert into `drizzle.__drizzle_migrations`:
  ```js
  import { createHash } from 'crypto';
  const hash = createHash('sha256').update(readFileSync('./drizzle/<file>.sql', 'utf8')).digest('hex');
  await sql`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES (${hash}, <journal_when_timestamp>)`;
  ```
- **Syntax error in migration file**: check for trailing garbage characters at the end of the SQL file (artifact from AI-generated code). Remove them.

### If a migration needs to be undone

Use drizzle-kit's own tooling:

```bash
npx drizzle-kit drop   # removes the last migration file and its journal entry
```

Then fix the schema and regenerate.

### If migrations appear to hang

The cause is almost always the dev server holding Postgres connections that block `ALTER TABLE`'s exclusive lock. Stop the dev server, then migrate.

Do not work around this by editing the journal or forcing SQL — fix the process order.

### Files

| Path | Purpose |
|---|---|
| `lib/db/schema.ts` | Single source of truth for the DB schema |
| `drizzle/*.sql` | Generated migration SQL — review but never edit |
| `drizzle/meta/_journal.json` | drizzle-kit internal — do not touch |
| `drizzle/meta/*_snapshot.json` | drizzle-kit internal — do not touch |
| `drizzle.config.js` | drizzle-kit config |
