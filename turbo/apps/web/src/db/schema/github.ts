import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";

/**
 * GitHub App installations table
 * Stores GitHub App installation information for each user
 */
export const githubInstallations = pgTable("github_installations", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$default(() => crypto.randomUUID()),
  userId: text("user_id").notNull(), // Clerk user ID
  installationId: integer("installation_id").notNull().unique(), // GitHub installation ID
  accountName: text("account_name").notNull(), // GitHub account/org name
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * GitHub repositories table
 * Links projects to GitHub repositories
 */
export const githubRepos = pgTable("github_repos", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$default(() => crypto.randomUUID()),
  projectId: text("project_id").notNull().unique(), // One repo per project
  installationId: integer("installation_id").notNull(), // Which installation owns this repo
  repoName: text("repo_name").notNull(), // Repository name (e.g., "uspark-123")
  repoId: integer("repo_id").notNull(), // GitHub repository ID
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
