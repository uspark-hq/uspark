import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

/**
 * Schema for caching GitHub repository statistics
 * Stores star counts and other metadata with TTL-based caching (1 hour)
 */
export const GITHUB_REPO_STATS_TBL = pgTable("github_repo_stats", {
  // Repository identifier in "owner/repo" format (primary key)
  repoUrl: text("repo_url").primaryKey().notNull(),

  // GitHub repository statistics
  stargazersCount: integer("stargazers_count").notNull(),
  forksCount: integer("forks_count"),
  openIssuesCount: integer("open_issues_count"),

  // GitHub App installation ID (if authenticated access was used)
  installationId: integer("installation_id"),

  // Cache metadata
  lastFetchedAt: timestamp("last_fetched_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type GithubRepoStats = typeof GITHUB_REPO_STATS_TBL.$inferSelect;
export type NewGithubRepoStats = typeof GITHUB_REPO_STATS_TBL.$inferInsert;
