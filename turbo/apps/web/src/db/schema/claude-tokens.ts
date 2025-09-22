import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Schema for Claude Code OAuth tokens
 * Each user can have exactly one Claude OAuth token
 *
 * Security considerations:
 * - OAuth tokens are stored encrypted in the database
 * - Only the token owner can view/modify their token
 * - Tokens are encrypted at rest using AES-256-GCM
 */
export const CLAUDE_TOKENS_TBL = pgTable("claude_tokens", {
  // Use userId as primary key since each user has only one token
  userId: text("user_id").primaryKey().notNull(), // Clerk user ID

  // Token information
  encryptedToken: text("encrypted_token").notNull(), // Encrypted Claude OAuth token
  tokenPrefix: text("token_prefix"), // First 10 chars for display

  // Usage tracking
  lastUsedAt: timestamp("last_used_at"), // Track usage
  lastErrorAt: timestamp("last_error_at"), // Track failures
  lastErrorMessage: text("last_error_message"), // Store last error for debugging

  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type ClaudeToken = typeof CLAUDE_TOKENS_TBL.$inferSelect;
export type NewClaudeToken = typeof CLAUDE_TOKENS_TBL.$inferInsert;
