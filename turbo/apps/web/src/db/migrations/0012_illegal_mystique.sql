-- Add name column as nullable first
ALTER TABLE "projects" ADD COLUMN "name" text;--> statement-breakpoint
-- Fill existing projects with their ID as the name
UPDATE "projects" SET "name" = "id" WHERE "name" IS NULL;--> statement-breakpoint
-- Make name NOT NULL after filling in values
ALTER TABLE "projects" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
-- Add unique constraint on (user_id, name)
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_name_unique" UNIQUE("user_id","name");