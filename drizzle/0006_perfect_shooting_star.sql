ALTER TABLE "positions" DROP CONSTRAINT "positions_team_id_teams_id_fk";
--> statement-breakpoint
ALTER TABLE "positions" ALTER COLUMN "organisation_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "positions" DROP COLUMN "team_id";