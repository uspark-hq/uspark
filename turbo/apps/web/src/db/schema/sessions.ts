import { pgTable, text, timestamp, json } from "drizzle-orm/pg-core";

/**
 * Schema for Claude sessions management
 * Implements the three-layer structure: sessions -> turns -> blocks
 */

// Sessions table - top level conversation containers
export const SESSIONS_TBL = pgTable("sessions", {
  id: text("id").primaryKey().notNull(), // sess_<uuid>
  projectId: text("project_id")
    .notNull()
    .references(() => PROJECTS_TBL.id),
  title: text("title"), // Optional session title
  type: text("type"), // 'initial-scan' for initial repository scan, null for regular sessions
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Turns table - individual user/assistant interaction pairs
export const TURNS_TBL = pgTable("turns", {
  id: text("id").primaryKey().notNull(), // turn_<uuid>
  sessionId: text("session_id")
    .notNull()
    .references(() => SESSIONS_TBL.id, { onDelete: "cascade" }),
  userPrompt: text("user_prompt").notNull(), // User's input message
  status: text("status").notNull().default("running"), // running, completed, failed, interrupted, cancelled
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"), // Error details if status is failed
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Blocks table - individual response blocks from Claude
export const BLOCKS_TBL = pgTable("blocks", {
  id: text("id").primaryKey().notNull(), // block_<uuid>
  turnId: text("turn_id")
    .notNull()
    .references(() => TURNS_TBL.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // thinking, content, tool_use, tool_result
  content: json("content").notNull(), // JSON content (auto-serialized by Drizzle)
  createdAt: timestamp("created_at").notNull().defaultNow(), // Used for ordering blocks
});

// Import projects table for reference
import { PROJECTS_TBL } from "./projects";

// Type exports
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

export type BlockContent =
  | { type: "thinking"; content: ThinkingBlockContent }
  | { type: "content"; content: ContentBlockContent }
  | { type: "tool_use"; content: ToolUseBlockContent }
  | { type: "tool_result"; content: ToolResultBlockContent };
