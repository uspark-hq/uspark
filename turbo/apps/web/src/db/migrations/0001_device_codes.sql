DO $$ BEGIN
 CREATE TYPE "public"."device_code_status" AS ENUM('pending', 'authenticated', 'expired', 'denied');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE "device_codes" (
	"code" varchar(9) PRIMARY KEY NOT NULL,
	"status" "device_code_status" DEFAULT 'pending' NOT NULL,
	"user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);