CREATE TABLE IF NOT EXISTS "github_installations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"installation_id" integer NOT NULL,
	"account_name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "github_installations_installation_id_unique" UNIQUE("installation_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "github_repos" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"installation_id" integer NOT NULL,
	"repo_name" text NOT NULL,
	"repo_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "github_repos_project_id_unique" UNIQUE("project_id")
);