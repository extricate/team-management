ALTER TABLE "employees" ADD COLUMN "personeelsnummer" text;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_personeelsnummer_unique" UNIQUE("personeelsnummer");