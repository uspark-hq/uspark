import { pgTable, text, timestamp, json } from "drizzle-orm/pg-core";
import { PROJECTS_TBL } from "./projects";

/**
 * Schema for worker management
 * Tracks active workers running on user machines for each project
 */
export const WORKERS_TBL = pgTable("workers", {
  id: text("id").primaryKey().notNull(), // worker_<uuid>
  projectId: text("project_id")
    .notNull()
    .references(() => PROJECTS_TBL.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(), // Clerk user ID - owner of the worker
  name: text("name"), // Optional worker name (e.g., machine name)
  status: text("status").notNull().default("active"), // 'active' | 'inactive'
  lastHeartbeatAt: timestamp("last_heartbeat_at").notNull().defaultNow(), // Last heartbeat timestamp
  metadata: json("metadata"), // Machine info, CLI version, etc.
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Type exports
export type Worker = typeof WORKERS_TBL.$inferSelect;
export type NewWorker = typeof WORKERS_TBL.$inferInsert;

// Worker metadata structure
export interface WorkerMetadata {
  hostname?: string;
  platform?: string;
  cliVersion?: string;
  nodeVersion?: string;
}
