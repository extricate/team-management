# Team Management

Teambeheer-applicatie voor COC2-I&V, Ministerie van Defensie.

Built with Next.js, PostgreSQL (Drizzle ORM), NextAuth v5, and Meilisearch.

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| [Docker](https://docs.docker.com/get-docker/) + Compose | any recent | Required for Postgres + Meilisearch |
| [Node.js](https://nodejs.org/) | 22 (LTS) | Use `nvm use` — version locked in `.nvmrc` |
| `make` | any | Ships with Linux/macOS, available in WSL |

---

## First-time setup

```bash
git clone <repo-url>
cd team-management
make setup
```

`make setup` does the following:

1. Copies `.env.example` → `.env` if it doesn't exist yet, then exits so you can set `AUTH_SECRET`
2. Starts Postgres and Meilisearch via Docker Compose
3. Installs npm dependencies
4. Runs database migrations
5. Seeds the admin user and reference data

**The generated admin password is printed once and not stored — save it immediately.**

After setup, the admin can log in and set up TOTP on first login.

---

## Daily development

```bash
make dev    # starts infra (if not running) + Next.js dev server
```

Open [http://localhost:3000](http://localhost:3000).

---

## Available commands

```
make setup       First-time setup
make dev         Start development server
make migrate     Run pending database migrations
make db-status   Check migration status
make seed        Seed admin user + reference data (idempotent)
make seed-demo   Seed with demo/test data
make build       Build the production Docker image
make prod        Build + start the full production stack in Docker
make reset       Destroy all data and re-setup (IRREVERSIBLE)
make help        List all commands
```

---

## Full Docker stack (optional)

For testers or machines where you don't want Node installed locally:

**Dev stack with hot-reload:**
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

**Production image:**
```bash
make prod
```
This builds the image, runs migrations, and starts the stack. The app is reachable on port 3000.

---

## Environment variables

Copy `.env.example` to `.env` and fill in the required values.

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH_SECRET` | Yes | Random secret — generate with `openssl rand -base64 33` |
| `AUTH_URL` | Yes | Public base URL (`http://localhost:3000` for local dev) |
| `ADMIN_EMAIL` | Yes (for seed) | Email address of the initial admin account |
| `ADMIN_NAME` | No | Display name of the admin account |
| `MEILISEARCH_HOST` | No | Defaults to `http://localhost:7700` |
| `MEILISEARCH_KEY` | No | Defaults to `teambeheer_search_key` (matches `docker-compose.yml`) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | No | SMTP credentials for outbound email |
| `RESEND_API_KEY` | No | Alternative to SMTP via [Resend](https://resend.com) |

> **Note:** When running the app inside Docker Compose (`make prod` or `make dev-docker`),
> `DATABASE_URL` and `MEILISEARCH_HOST` are automatically overridden to use Docker service
> names — you don't need to change them in `.env`.

---

## Database workflow

```bash
# After editing lib/db/schema.ts:
npm run db:generate   # generate migration SQL
npm run db:migrate    # apply migrations
npm run db:status     # verify all [OK]
```

See [CLAUDE.md](CLAUDE.md) for the full Drizzle migration guide.

---

## Search reindex

If search results are out of sync:

```bash
npm run search:reindex
```

Search degrades gracefully when Meilisearch is unreachable — the app continues to work, search results are just empty.
