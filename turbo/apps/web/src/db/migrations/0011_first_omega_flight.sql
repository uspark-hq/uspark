ALTER TABLE "projects" ADD COLUMN "source_repo_url" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "source_repo_installation_id" integer;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "initial_scan_status" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "initial_scan_session_id" text;