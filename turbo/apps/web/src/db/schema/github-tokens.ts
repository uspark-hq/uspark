import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";

/**
 * Schema for GitHub OAuth tokens
 * Stores encrypted GitHub access tokens for users
 */
export const GITHUB_TOKENS_TBL = pgTable("github_tokens", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().unique(), // Clerk user ID
  githubUserId: text("github_user_id").notNull(), // GitHub user ID
  githubUsername: text("github_username").notNull(), // GitHub username
  encryptedAccessToken: text("encrypted_access_token").notNull(), // Encrypted GitHub access token
  scope: text("scope").notNull(), // OAuth scope granted
  lastSyncedAt: timestamp("last_synced_at"), // Last successful sync timestamp
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("github_tokens_user_id_idx").on(table.userId),
  githubUserIdIdx: index("github_tokens_github_user_id_idx").on(table.githubUserId),
}));

/**
 * Schema for GitHub repositories linked to projects
 */
export const GITHUB_REPOS_TBL = pgTable("github_repos", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id").notNull(), // Reference to projects table
  userId: text("user_id").notNull(), // Clerk user ID
  repoName: text("repo_name").notNull(), // Repository name (e.g., "my-project-docs")
  repoFullName: text("repo_full_name").notNull(), // Full repository name (e.g., "username/my-project-docs")
  repoId: text("repo_id").notNull(), // GitHub repository ID
  defaultBranch: text("default_branch").notNull().default("main"),
  webhookId: text("webhook_id"), // GitHub webhook ID
  webhookSecret: text("webhook_secret"), // Webhook secret for verification
  lastPushedAt: timestamp("last_pushed_at"), // Last push timestamp
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  projectIdIdx: index("github_repos_project_id_idx").on(table.projectId),
  userIdIdx: index("github_repos_user_id_idx").on(table.userId),
  repoIdIdx: index("github_repos_repo_id_idx").on(table.repoId),
}));

/**
 * Schema for GitHub sync operations log
 */
export const GITHUB_SYNC_LOG_TBL = pgTable("github_sync_log", {
  id: text("id")
    .primaryKey()
    .notNull()
    .$defaultFn(() => crypto.randomUUID()),
  repoId: text("repo_id").notNull(), // Reference to github_repos
  direction: text("direction").notNull(), // "push" or "pull"
  status: text("status").notNull(), // "success", "failed", "pending"
  commitSha: text("commit_sha"), // Git commit SHA
  error: text("error"), // Error message if failed
  filesChanged: text("files_changed"), // JSON array of changed files
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  repoIdIdx: index("github_sync_log_repo_id_idx").on(table.repoId),
  createdAtIdx: index("github_sync_log_created_at_idx").on(table.createdAt),
}));

export type GitHubToken = typeof GITHUB_TOKENS_TBL.$inferSelect;
export type NewGitHubToken = typeof GITHUB_TOKENS_TBL.$inferInsert;

export type GitHubRepo = typeof GITHUB_REPOS_TBL.$inferSelect;
export type NewGitHubRepo = typeof GITHUB_REPOS_TBL.$inferInsert;

export type GitHubSyncLog = typeof GITHUB_SYNC_LOG_TBL.$inferSelect;
export type NewGitHubSyncLog = typeof GITHUB_SYNC_LOG_TBL.$inferInsert;