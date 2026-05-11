ALTER TABLE "positions" ADD COLUMN "schaal" text;--> statement-breakpoint
ALTER TABLE "positions" ADD COLUMN "annual_cost" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;