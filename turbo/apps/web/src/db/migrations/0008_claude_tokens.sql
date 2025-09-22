CREATE TABLE "claude_tokens" (
	"user_id" text PRIMARY KEY NOT NULL,
	"encrypted_token" text NOT NULL,
	"token_prefix" text,
	"last_used_at" timestamp,
	"last_error_at" timestamp,
	"last_error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);