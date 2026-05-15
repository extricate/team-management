.PHONY: setup dev dev-docker prod build seed seed-demo migrate db-status reset help

.DEFAULT_GOAL := help

COMPOSE_BASE := docker compose -f docker-compose.yml
COMPOSE_DEV  := $(COMPOSE_BASE) -f docker-compose.dev.yml
COMPOSE_PROD := $(COMPOSE_BASE) -f docker-compose.prod.yml

# ─── Help ──────────────────────────────────────────────────────────────────────

help: ## Show available commands
	@echo ""
	@echo "  Team Management — available commands"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'
	@echo ""

# ─── First-time setup ──────────────────────────────────────────────────────────

setup: ## First-time setup: copy .env, start infra, install deps, migrate, seed
	@echo ""
	@echo "==> Checking prerequisites..."
	@command -v docker >/dev/null 2>&1 || { echo "ERROR: docker is not installed"; exit 1; }
	@command -v node >/dev/null 2>&1   || { echo "ERROR: node is not installed (see .nvmrc)"; exit 1; }
	@command -v npm >/dev/null 2>&1    || { echo "ERROR: npm is not installed"; exit 1; }
	@echo ""
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "==> Created .env from .env.example."; \
		echo "    Edit it and set AUTH_SECRET before continuing:"; \
		echo ""; \
		echo "      AUTH_SECRET=\$$(openssl rand -base64 33)"; \
		echo ""; \
		echo "    Then re-run: make setup"; \
		echo ""; \
		exit 1; \
	fi
	@echo "==> Starting infrastructure (Postgres + Meilisearch)..."
	$(COMPOSE_BASE) up -d --wait db meilisearch
	@echo "==> Installing dependencies..."
	npm install
	@echo "==> Running migrations..."
	npm run db:migrate
	@echo "==> Seeding admin user and reference data..."
	npm run db:seed
	@echo ""
	@echo "  Setup complete. Run 'make dev' to start the development server."
	@echo "  Open http://localhost:3000"
	@echo ""

# ─── Development ───────────────────────────────────────────────────────────────

dev: ## Start the Next.js dev server (runs infra first if not already up)
	$(COMPOSE_BASE) up -d --wait db meilisearch
	npm run dev

dev-docker: ## Start the full dev stack in Docker with hot-reload
	$(COMPOSE_DEV) up

# ─── Production (Docker image) ─────────────────────────────────────────────────

build: ## Build the production Docker image
	$(COMPOSE_PROD) build

prod: ## Build + start the full production stack in Docker
	$(COMPOSE_PROD) build
	npm run db:migrate
	$(COMPOSE_PROD) up -d
	@echo ""
	@echo "  Production stack running at http://localhost:3000"
	@echo ""

# ─── Database ──────────────────────────────────────────────────────────────────

migrate: ## Run pending database migrations
	npm run db:migrate

db-status: ## Check migration status
	npm run db:status

seed: ## Seed admin user and reference data (idempotent)
	npm run db:seed

seed-demo: ## Seed with demo data (use --reset flag to wipe first: make seed-demo ARGS=-- --reset)
	npm run db:seed:demo $(ARGS)

# ─── Nuclear reset ─────────────────────────────────────────────────────────────

reset: ## Destroy all data, recreate DB, migrate, and seed (IRREVERSIBLE)
	@echo ""
	@echo "  WARNING: This will destroy all database data."
	@echo "  Press Enter to continue, or Ctrl+C to cancel."
	@read -r _
	$(COMPOSE_BASE) down -v
	$(COMPOSE_BASE) up -d --wait db meilisearch
	npm run db:migrate
	npm run db:seed
	@echo ""
	@echo "  Reset complete."
	@echo ""
