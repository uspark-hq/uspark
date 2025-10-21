CREATE TABLE "workers" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
	"name" text,
	"status" text DEFAULT 'active' NOT NULL,
	"last_heartbeat_at" timestamp DEFAULT now() NOT NULL,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "turns" ALTER COLUMN "status" SET DEFAULT 'running';--> statement-breakpoint
ALTER TABLE "workers" ADD CONSTRAINT "workers_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "turns" DROP COLUMN "started_at";