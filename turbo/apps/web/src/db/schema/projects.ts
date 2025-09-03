import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";

/**
 * Schema for projects with YDoc storage
 * Stores serialized YDoc data and metadata for file synchronization
 */
export const PROJECTS_TBL = pgTable("projects", {
  id: text("id").primaryKey().notNull(), // User-provided project ID
  userId: text("user_id").notNull(), // Clerk user ID or CLI token owner
  ydocData: text("ydoc_data").notNull(), // Serialized YDoc binary data (base64 encoded)
  version: integer("version").notNull().default(0), // Optimistic lock version
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Project = typeof PROJECTS_TBL.$inferSelect;
export type NewProject = typeof PROJECTS_TBL.$inferInsert;