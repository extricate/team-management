CREATE TABLE "company_persex_budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year" integer NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"status" text DEFAULT 'concept' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "company_persex_budgets_year_unique" UNIQUE("year")
);
--> statement-breakpoint
ALTER TABLE "funding_allocations" ALTER COLUMN "financial_source_amount_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "funding_allocations" ADD COLUMN "company_persex_budget_id" uuid;--> statement-breakpoint
ALTER TABLE "funding_allocations" ADD CONSTRAINT "funding_allocations_company_persex_budget_id_company_persex_budgets_id_fk" FOREIGN KEY ("company_persex_budget_id") REFERENCES "public"."company_persex_budgets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_sources" DROP COLUMN "is_company_persex";