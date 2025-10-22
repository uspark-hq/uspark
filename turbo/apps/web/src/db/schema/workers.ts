import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { PROJECTS_TBL } from "./projects";

/**
 * Schema for worker management
 * Tracks active workers running on user machines for each project
 */
export const WORKERS_TBL = pgTable(
  "workers",
  {
    id: text("id").primaryKey().notNull(), // Client-generated UUID
    projectId: text("project_id")
      .notNull()
      .references(() => PROJECTS_TBL.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(), // Clerk user ID - owner of the worker
    status: text("status").notNull().default("active"), // 'active' | 'inactive'
    lastHeartbeatAt: timestamp("last_heartbeat_at").notNull().defaultNow(), // Last heartbeat timestamp
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    // Index for efficient project-based queries
    projectIdIdx: index("workers_project_id_idx").on(table.projectId),
    // Composite index for user+project queries
    userProjectIdx: index("workers_user_project_idx").on(
      table.userId,
      table.projectId,
    ),
  }),
);

// Type exports
export type Worker = typeof WORKERS_TBL.$inferSelect;
export type NewWorker = typeof WORKERS_TBL.$inferInsert;
