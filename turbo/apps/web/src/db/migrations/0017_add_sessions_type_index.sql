-- Add index for efficient cron session lookup
-- This optimizes queries like: WHERE project_id = ? AND type = 'cron'
CREATE INDEX IF NOT EXISTS "idx_sessions_project_type" ON "sessions" USING btree ("project_id", "type");
