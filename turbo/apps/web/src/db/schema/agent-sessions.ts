import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { PROJECTS_TBL } from "./projects";

/**
 * Schema for agent session tracking
 * Stores agent execution session history and status
 */
export const AGENT_SESSIONS_TBL = pgTable("agent_sessions", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id")
    .notNull()
    .references(() => PROJECTS_TBL.id),
  userId: text("user_id").notNull(),
  prompt: text("prompt").notNull(),
  status: text("status").notNull().default("pending"),
  containerId: text("container_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export type AgentSession = typeof AGENT_SESSIONS_TBL.$inferSelect;
export type NewAgentSession = typeof AGENT_SESSIONS_TBL.$inferInsert;
