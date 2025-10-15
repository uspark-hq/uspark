-- Drop the unique constraint on sequence_number
ALTER TABLE "blocks" DROP CONSTRAINT IF EXISTS "blocks_turn_id_sequence_number_unique";

-- Drop the index on sequence_number
DROP INDEX IF EXISTS "idx_blocks_sequence";

-- Drop the sequence_number column
ALTER TABLE "blocks" DROP COLUMN IF EXISTS "sequence_number";

-- Add index on created_at for efficient ordering
CREATE INDEX IF NOT EXISTS "idx_blocks_turn_created" ON "blocks" USING btree ("turn_id", "created_at");
