ALTER TABLE "github_repos" ADD COLUMN "last_sync_commit_sha" text;--> statement-breakpoint
ALTER TABLE "github_repos" ADD COLUMN "last_sync_at" timestamp;