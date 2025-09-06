import { pgTable, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { PROJECTS_TBL } from "./projects";

/**
 * Sessions table - stores Claude conversation sessions for projects
 */
export const SESSIONS_TBL = pgTable("sessions", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => `session_${crypto.randomUUID()}`),
  projectId: text("project_id")
    .notNull()
    .references(() => PROJECTS_TBL.id),
  title: text("title"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * Turns table - stores individual conversation turns within sessions
 */
export const TURNS_TBL = pgTable("turns", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => `turn_${crypto.randomUUID()}`),
  sessionId: text("session_id")
    .notNull()
    .references(() => SESSIONS_TBL.id, { onDelete: "cascade" }),
  userPrompt: text("user_prompt").notNull(),
  status: text("status").notNull().default("pending"), // pending, running, completed, failed
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * Blocks table - stores individual content blocks within turns
 */
export const BLOCKS_TBL = pgTable("blocks", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => `block_${crypto.randomUUID()}`),
  turnId: text("turn_id")
    .notNull()
    .references(() => TURNS_TBL.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // thinking, content, tool_use, tool_result
  content: jsonb("content").notNull(),
  sequenceNumber: integer("sequence_number").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Type exports for TypeScript
export type Session = typeof SESSIONS_TBL.$inferSelect;
export type NewSession = typeof SESSIONS_TBL.$inferInsert;

export type Turn = typeof TURNS_TBL.$inferSelect;
export type NewTurn = typeof TURNS_TBL.$inferInsert;

export type Block = typeof BLOCKS_TBL.$inferSelect;
export type NewBlock = typeof BLOCKS_TBL.$inferInsert;

// Block content types
export interface ThinkingBlockContent {
  text: string;
}

export interface ContentBlockContent {
  text: string;
}

export interface ToolUseBlockContent {
  tool_name: string;
  parameters: Record<string, unknown>;
  tool_use_id: string;
}

export interface ToolResultBlockContent {
  tool_use_id: string;
  result: string;
  error?: string | null;
}
