import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Schema for CLI access tokens
 * Stores long-lived tokens for CLI/CI usage
 */
export const CLI_TOKENS_TBL = pgTable("cli_tokens", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => crypto.randomUUID()),
  token: text("token").notNull().unique(), // The actual token value (e.g., usp_live_xxx)
  userId: text("user_id").notNull(), // Clerk user ID
  name: text("name").notNull(), // User-provided name for the token
  expiresAt: timestamp("expires_at").notNull(),
  lastUsedAt: timestamp("last_used_at"), // Track when token was last used
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type CliToken = typeof CLI_TOKENS_TBL.$inferSelect;
export type NewCliToken = typeof CLI_TOKENS_TBL.$inferInsert;
