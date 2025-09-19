-- Add versioning columns to sessions and turns tables
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE turns ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE turns ADD COLUMN IF NOT EXISTS block_count INTEGER DEFAULT 0 NOT NULL;

-- Create indexes for efficient version-based queries
CREATE INDEX IF NOT EXISTS idx_sessions_version ON sessions(id, version);
CREATE INDEX IF NOT EXISTS idx_turns_session_version ON turns(session_id, version);