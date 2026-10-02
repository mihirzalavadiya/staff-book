CREATE TYPE "public"."gender" AS ENUM('female', 'male');--> statement-breakpoint
ALTER TABLE "workers" ADD COLUMN "gender" "gender" DEFAULT 'female' NOT NULL;