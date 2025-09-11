CREATE TABLE IF NOT EXISTS "github_repos" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
	"repo_name" text NOT NULL,
	"repo_full_name" text NOT NULL,
	"repo_id" text NOT NULL,
	"default_branch" text DEFAULT 'main' NOT NULL,
	"webhook_id" text,
	"webhook_secret" text,
	"last_pushed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "github_sync_log" (
	"id" text PRIMARY KEY NOT NULL,
	"repo_id" text NOT NULL,
	"direction" text NOT NULL,
	"status" text NOT NULL,
	"commit_sha" text,
	"error" text,
	"files_changed" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "github_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"github_user_id" text NOT NULL,
	"github_username" text NOT NULL,
	"encrypted_access_token" text NOT NULL,
	"scope" text NOT NULL,
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "github_tokens_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "github_repos_project_id_idx" ON "github_repos" USING btree ("project_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "github_repos_user_id_idx" ON "github_repos" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "github_repos_repo_id_idx" ON "github_repos" USING btree ("repo_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "github_sync_log_repo_id_idx" ON "github_sync_log" USING btree ("repo_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "github_sync_log_created_at_idx" ON "github_sync_log" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "github_tokens_user_id_idx" ON "github_tokens" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "github_tokens_github_user_id_idx" ON "github_tokens" USING btree ("github_user_id");