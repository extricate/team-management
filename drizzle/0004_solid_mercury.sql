CREATE TABLE "functies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"titel" text NOT NULL,
	"schaal_code" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medewerker_functies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"functie_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"status" text DEFAULT 'active' NOT NULL,
	"reason" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "positions" ALTER COLUMN "type" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "positions" ADD COLUMN "functie_id" uuid;--> statement-breakpoint
ALTER TABLE "positions" ADD COLUMN "roltitel" text;--> statement-breakpoint
ALTER TABLE "medewerker_functies" ADD CONSTRAINT "medewerker_functies_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medewerker_functies" ADD CONSTRAINT "medewerker_functies_functie_id_functies_id_fk" FOREIGN KEY ("functie_id") REFERENCES "public"."functies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medewerker_functies" ADD CONSTRAINT "medewerker_functies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "functies_titel_idx" ON "functies" USING btree ("titel");--> statement-breakpoint
CREATE UNIQUE INDEX "medewerker_functies_emp_functie_idx" ON "medewerker_functies" USING btree ("employee_id","functie_id");--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_functie_id_functies_id_fk" FOREIGN KEY ("functie_id") REFERENCES "public"."functies"("id") ON DELETE no action ON UPDATE no action;