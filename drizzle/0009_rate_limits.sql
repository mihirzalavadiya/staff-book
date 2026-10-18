CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone DEFAULT now() NOT NULL,
	"count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
-- Like every other table: no Data API access, only the server through Drizzle.
ALTER TABLE "rate_limits" ENABLE ROW LEVEL SECURITY;
