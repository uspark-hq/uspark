import { pgTable, text, timestamp, integer, unique } from "drizzle-orm/pg-core";

/**
 * Schema for projects with YDoc storage
 * Stores serialized YDoc data and metadata for file synchronization
 */
export const PROJECTS_TBL = pgTable(
  "projects",
  {
    id: text("id").primaryKey().notNull(), // System-generated unique project ID (UUID v4)
    userId: text("user_id").notNull(), // Clerk user ID or CLI token owner
    name: text("name").notNull(), // User-defined project name (unique per user)
    ydocData: text("ydoc_data").notNull(), // Serialized YDoc binary data (base64 encoded)
    version: integer("version").notNull().default(0), // Optimistic lock version
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    // GitHub repository onboarding fields
    sourceRepoUrl: text("source_repo_url"), // Format: "owner/repo"
    sourceRepoInstallationId: integer("source_repo_installation_id"), // GitHub App installation ID for access
    sourceRepoType: text("source_repo_type"), // 'installed' | 'public' - Type of GitHub repository access
    initialScanStatus: text("initial_scan_status"), // 'pending' | 'running' | 'completed' | 'failed' | null
    initialScanSessionId: text("initial_scan_session_id"), // Links to scanning session
  },
  (table) => ({
    // Ensure project names are unique per user
    userProjectNameUnique: unique().on(table.userId, table.name),
  }),
);

export type Project = typeof PROJECTS_TBL.$inferSelect;
export type NewProject = typeof PROJECTS_TBL.$inferInsert;
