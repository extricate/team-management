# Team Management — Claude Instructions

## Tech stack

Next.js 16, Drizzle ORM + drizzle-kit, PostgreSQL 16, NextAuth v5, Meilisearch. Dutch government org (~700 employees). UI language is Dutch.

Vitest is using as a testing framework for this application. Vitest is invoced using 'npm run test' in bash. We do not have npx installed locally.

## Dev environment

If you need to run migrations mid-session, stop the dev server first (`Ctrl+C`), then:

```bash
npm run db:migrate
npm run dev
```

## Writing and generating code

When generating or writing new code, always use the TDD skill located in .claude/skills/tdd.

When debugging issues that require code changes, also write regression tests.

Use modern software engineering testing conventions.

## Database / Drizzle

### Check migration state first

Before assuming migrations failed or succeeded, run:

```bash
npm run db:status
```

This prints `[OK]` or `[PENDING]` for every migration and exits non-zero if anything is pending. Use it whenever you're unsure whether `db:migrate` actually did something — Drizzle's own output gives no feedback when migrations are already up-to-date.

**Important**: `npm run dev:start` auto-runs `db:migrate` on startup. If you start the dev server first and then run `db:migrate` manually, Drizzle will show no output because there is nothing left to do. `db:status` makes this unambiguous.

### The only correct flow for schema changes

1. Edit `lib/db/schema.ts`
2. `npm run db:generate` — drizzle-kit diffs the schema against the latest snapshot and writes a new SQL file + snapshot into `drizzle/`
3. Review the generated SQL in `drizzle/`
4. Stop the dev server, then: `npm run db:migrate && npm run db:status`
5. `db:status` should show all `[OK]` — only then restart the dev server

### Hard rules — never break these

- **Never manually edit files in `drizzle/meta/`** (`_journal.json`, snapshot `.json` files). These are drizzle-kit's internal state. Editing them by hand corrupts the migration chain.
- **Never manually create or edit migration SQL files** in `drizzle/`. Always let `drizzle-kit generate` produce them.
- **Never delete snapshot files.** `drizzle-kit generate` reads the latest snapshot to compute what changed. Deleting one breaks all future generations.

### If `drizzle-kit migrate` silently fails (exit code 1, spinner never clears)

First run `npm run db:status` — if all show `[OK]`, the migration already ran (e.g. via `dev:start`) and there is nothing wrong.

If `[PENDING]` migrations exist, it is failing silently. Diagnose by running each pending SQL manually:

```js
// node --env-file=.env --input-type=module
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
