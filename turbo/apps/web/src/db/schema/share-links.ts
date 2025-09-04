import { pgTable, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { PROJECTS_TBL } from "./projects";

/**
 * Schema for document sharing links
 * Stores shareable links for documents and projects
 */
export const SHARE_LINKS_TBL = pgTable(
  "share_links",
  {
    id: text("id")
      .primaryKey()
      .notNull()
      .$defaultFn(() => crypto.randomUUID()),
    token: text("token").notNull().unique(),
    projectId: text("project_id")
      .notNull()
      .references(() => PROJECTS_TBL.id),
    filePath: text("file_path"), // NULL means entire project
    userId: text("user_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    accessedCount: integer("accessed_count").notNull().default(0),
    lastAccessedAt: timestamp("last_accessed_at"),
  },
  (table) => {
    return {
      shareTokenIdx: index("idx_share_token").on(table.token),
    };
  },
);

export type ShareLink = typeof SHARE_LINKS_TBL.$inferSelect;
export type NewShareLink = typeof SHARE_LINKS_TBL.$inferInsert;
