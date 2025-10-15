-- Drop claude_tokens table (no longer needed with shared token)
ALTER TABLE "claude_tokens" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "claude_tokens" CASCADE;--> statement-breakpoint

-- Remove sequenceNumber from blocks table
ALTER TABLE "blocks" DROP CONSTRAINT IF EXISTS "blocks_turn_id_sequence_number_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_blocks_sequence";--> statement-breakpoint
ALTER TABLE "blocks" DROP COLUMN IF EXISTS "sequence_number";--> statement-breakpoint

-- Add index on created_at for efficient ordering
CREATE INDEX IF NOT EXISTS "idx_blocks_turn_created" ON "blocks" USING btree ("turn_id", "created_at");