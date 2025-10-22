CREATE TABLE "github_repo_stats" (
	"repo_url" text PRIMARY KEY NOT NULL,
	"stargazers_count" integer NOT NULL,
	"forks_count" integer,
	"open_issues_count" integer,
	"installation_id" integer,
	"last_fetched_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
