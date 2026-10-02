CREATE TYPE "public"."attendance_state" AS ENUM('present', 'leave', 'claim', 'dispute');--> statement-breakpoint
CREATE TYPE "public"."dispute_resolution" AS ENUM('present', 'leave');--> statement-breakpoint
CREATE TYPE "public"."engagement_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."lang" AS ENUM('en', 'hi');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('cook', 'maid', 'driver', 'milk', 'other');--> statement-breakpoint
CREATE TYPE "public"."side" AS ENUM('household', 'worker', 'system');--> statement-breakpoint
CREATE TYPE "public"."avatar_tone" AS ENUM('purple', 'blue', 'green', 'yellow', 'peach');--> statement-breakpoint
CREATE TABLE "advances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"engagement_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"date" date NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"engagement_id" uuid NOT NULL,
	"date" date NOT NULL,
	"state" "attendance_state" NOT NULL,
	"marked_by" "side" NOT NULL,
	"note" text,
	"voice_seconds" smallint,
	"voice_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "engagements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"worker_id" uuid NOT NULL,
	"role" "role" NOT NULL,
	"monthly_salary" integer NOT NULL,
	"work_days" smallint[] DEFAULT '{1,2,3,4,5,6}'::smallint[] NOT NULL,
	"paid_leaves_per_month" smallint DEFAULT 2 NOT NULL,
	"tone" "avatar_tone" DEFAULT 'purple' NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"worker_token" text NOT NULL,
	"status" "engagement_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "engagements_worker_token_unique" UNIQUE("worker_token")
);
--> statement-breakpoint
CREATE TABLE "households" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"owner_name" text NOT NULL,
	"name" text NOT NULL,
	"home_label" text,
	"lat" text,
	"lng" text,
	"geofence_m" integer DEFAULT 150 NOT NULL,
	"notify_at" time DEFAULT '20:00' NOT NULL,
	"language" "lang" DEFAULT 'en' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "households_owner_user_id_unique" UNIQUE("owner_user_id")
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid,
	"engagement_id" uuid,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "settlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"engagement_id" uuid NOT NULL,
	"month" text NOT NULL,
	"working_days" smallint NOT NULL,
	"days_present" smallint NOT NULL,
	"days_leave" smallint NOT NULL,
	"paid_leave_used" smallint NOT NULL,
	"unpaid_deduction" integer NOT NULL,
	"advance_deducted" integer NOT NULL,
	"amount_due" integer NOT NULL,
	"finalized_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finalized_by" "side" DEFAULT 'household' NOT NULL,
	"paid_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "workers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"language" "lang" DEFAULT 'hi' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "advances" ADD CONSTRAINT "advances_engagement_id_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_engagement_id_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_worker_id_workers_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_engagement_id_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_engagement_id_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "advances_engagement_idx" ON "advances" USING btree ("engagement_id","date");--> statement-breakpoint
CREATE INDEX "attendance_engagement_date_idx" ON "attendance" USING btree ("engagement_id","date","created_at");--> statement-breakpoint
CREATE INDEX "engagements_household_idx" ON "engagements" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "engagements_worker_idx" ON "engagements" USING btree ("worker_id");--> statement-breakpoint
CREATE INDEX "push_household_idx" ON "push_subscriptions" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "push_engagement_idx" ON "push_subscriptions" USING btree ("engagement_id");--> statement-breakpoint
CREATE UNIQUE INDEX "settlements_engagement_month_uq" ON "settlements" USING btree ("engagement_id","month");