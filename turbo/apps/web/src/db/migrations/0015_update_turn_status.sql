-- Migrate existing pending and in_progress statuses to running
UPDATE "turns" SET "status" = 'running' WHERE "status" IN ('pending', 'in_progress');
--> statement-breakpoint
-- Drop the started_at column as it's no longer needed (use created_at instead)
ALTER TABLE "turns" DROP COLUMN IF EXISTS "started_at";
