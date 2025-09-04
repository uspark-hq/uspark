import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { PROJECTS_TBL } from "./projects";

/**
 * Schema for share links that enable public access to single files
 * Only supports sharing specific files, not entire projects
 */
export const SHARE_LINKS_TBL = pgTable("share_links", {
  id: text("id").primaryKey().notNull(), // UUID or nanoid for the share link
  token: text("token").unique().notNull(), // Unique token for public access
  projectId: text("project_id").notNull().references(() => PROJECTS_TBL.id), // Reference to project
  filePath: text("file_path").notNull(), // Required: specific file path within project
  userId: text("user_id").notNull(), // Clerk user ID who created the share
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ShareLink = typeof SHARE_LINKS_TBL.$inferSelect;
export type NewShareLink = typeof SHARE_LINKS_TBL.$inferInsert;