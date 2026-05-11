CREATE TABLE "bestelling_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"naam" text NOT NULL,
	"omschrijving" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bestellingen" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"type_id" uuid NOT NULL,
	"atb_nummer" text NOT NULL,
	"omschrijving" text NOT NULL,
	"geraamd_bedrag" numeric(15, 2),
	"werkelijk_bedrag" numeric(15, 2),
	"aanvraag_datum" timestamp,
	"notities" text,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "funding_allocations" ADD COLUMN "bestelling_id" uuid;--> statement-breakpoint
ALTER TABLE "positions" ADD COLUMN "bestelling_id" uuid;--> statement-breakpoint
ALTER TABLE "bestellingen" ADD CONSTRAINT "bestellingen_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bestellingen" ADD CONSTRAINT "bestellingen_type_id_bestelling_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."bestelling_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funding_allocations" ADD CONSTRAINT "funding_allocations_bestelling_id_bestellingen_id_fk" FOREIGN KEY ("bestelling_id") REFERENCES "public"."bestellingen"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_bestelling_id_bestellingen_id_fk" FOREIGN KEY ("bestelling_id") REFERENCES "public"."bestellingen"("id") ON DELETE no action ON UPDATE no action;