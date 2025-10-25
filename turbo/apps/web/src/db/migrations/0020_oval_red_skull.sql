CREATE TABLE "project_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"version" integer NOT NULL,
	"ydoc_snapshot" "bytea" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_versions" ADD CONSTRAINT "project_versions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;