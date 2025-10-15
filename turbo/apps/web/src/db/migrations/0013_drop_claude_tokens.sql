-- Drop claude_tokens table as we no longer store user tokens
-- All users now share the same DEFAULT_CLAUDE_TOKEN from environment
DROP TABLE IF EXISTS "claude_tokens";
