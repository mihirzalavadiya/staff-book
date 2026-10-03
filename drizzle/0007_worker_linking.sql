ALTER TABLE "engagements" ADD COLUMN "link_to_worker_id" uuid;--> statement-breakpoint
ALTER TABLE "workers" ADD COLUMN "phone_key" text;--> statement-breakpoint
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_link_to_worker_id_workers_id_fk" FOREIGN KEY ("link_to_worker_id") REFERENCES "public"."workers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workers_phone_key_idx" ON "workers" USING btree ("phone_key");--> statement-breakpoint
-- Backfill: last 10 digits of existing phone numbers.
UPDATE "workers" SET "phone_key" = right(regexp_replace("phone", '\D', '', 'g'), 10)
WHERE "phone" IS NOT NULL AND length(regexp_replace("phone", '\D', '', 'g')) >= 10;
