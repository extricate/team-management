CREATE TABLE "login_rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"attempts" integer DEFAULT 1 NOT NULL,
	"window_start" timestamp DEFAULT now() NOT NULL
);
