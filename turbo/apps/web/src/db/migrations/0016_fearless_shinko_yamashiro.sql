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
ALTER TABLE "workers" ADD CONSTRAINT "workers_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workers_project_id_idx" ON "workers" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "workers_user_project_idx" ON "workers" USING btree ("user_id","project_id");