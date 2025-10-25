import {
  pgTable,
  text,
  timestamp,
  integer,
  customType,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { PROJECTS_TBL } from "./projects";

// Custom bytea type for storing binary data
const bytea = customType<{ data: Buffer }>({
  dataType() {
    return "bytea";
  },
  toDriver(value: Buffer) {
    return value;
  },
  fromDriver(value: unknown) {
    return value as Buffer;
  },
});

/**
 * Schema for project version history
 * Stores YDoc snapshots for each version to enable diff calculation
 */
export const PROJECT_VERSIONS_TBL = pgTable(
  "project_versions",
  {
    id: text("id").primaryKey().notNull(), // UUID
    projectId: text("project_id")
      .notNull()
      .references(() => PROJECTS_TBL.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    version: integer("version").notNull(), // Version number
    ydocSnapshot: bytea("ydoc_snapshot").notNull(), // Full YDoc state at this version
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    // Unique constraint on (project_id, version)
    projectIdVersionUnique: unique(
      "project_versions_project_id_version_unique",
    ).on(table.projectId, table.version),
    // Index for efficient version lookup
    projectVersionIdx: index("idx_project_versions_lookup").on(
      table.projectId,
      table.version.desc(),
    ),
  }),
);

export type ProjectVersion = typeof PROJECT_VERSIONS_TBL.$inferSelect;
export type NewProjectVersion = typeof PROJECT_VERSIONS_TBL.$inferInsert;
