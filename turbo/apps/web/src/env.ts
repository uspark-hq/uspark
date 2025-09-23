import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

function initEnv() {
  // In test environment, provide default values if not set
  // This allows tests to run even if setup.ts hasn't run yet
  const isTest = process.env.NODE_ENV === "test";

  return createEnv({
    server: {
      DATABASE_URL: z.string().min(1),
      CLERK_SECRET_KEY: z.string().min(1),
      BLOB_READ_WRITE_TOKEN: z.string().min(1),
      E2B_API_KEY: z.string().min(1).optional(),
      APP_URL: z
        .string()
        .default(
          process.env.NODE_ENV === "production"
            ? "https://www.uspark.ai"
            : "http://localhost:3000",
        ),
      GH_APP_ID: z.string().min(1),
      GH_APP_PRIVATE_KEY: z.string().min(1),
      GH_WEBHOOK_SECRET: z.string().min(1),
      CLAUDE_TOKEN_ENCRYPTION_KEY: z.string().length(64).optional(), // 32 bytes as hex = 64 chars
    },
    client: {
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
    },
    runtimeEnv: {
      DATABASE_URL: process.env.DATABASE_URL,
      CLERK_SECRET_KEY: isTest
        ? "sk_test_mock_secret_key_for_testing"
        : process.env.CLERK_SECRET_KEY,
      BLOB_READ_WRITE_TOKEN: isTest
        ? "vercel_blob_rw_test-store_secret-key"
        : process.env.BLOB_READ_WRITE_TOKEN,
      E2B_API_KEY: process.env.E2B_API_KEY,
      APP_URL: process.env.APP_URL,
      GH_APP_ID: isTest ? "test_github_app_id" : process.env.GH_APP_ID,
      GH_APP_PRIVATE_KEY: isTest
        ? "test_private_key_placeholder"
        : process.env.GH_APP_PRIVATE_KEY,
      GH_WEBHOOK_SECRET: isTest
        ? "test_github_webhook_secret"
        : process.env.GH_WEBHOOK_SECRET,
      CLAUDE_TOKEN_ENCRYPTION_KEY: isTest
        ? "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
        : process.env.CLAUDE_TOKEN_ENCRYPTION_KEY,
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: isTest
        ? "pk_test_mock_instance.clerk.accounts.dev$"
        : process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    },
    emptyStringAsUndefined: true,
  });
}

/**
 * Environment configuration schema
 * Call this function to get validated environment variables
 */
let _env: ReturnType<typeof initEnv> | undefined;
export function env() {
  if (!_env) {
    _env = initEnv();
  }

  return _env;
}

// Export type for type inference
export type Env = ReturnType<typeof env>;
