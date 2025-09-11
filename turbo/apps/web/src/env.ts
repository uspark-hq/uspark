import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

function initEnv() {
  return createEnv({
    server: {
      DATABASE_URL: z.string().min(1),
      CLERK_SECRET_KEY: z.string().min(1),
      BLOB_READ_WRITE_TOKEN: z.string().min(1),
      E2B_API_KEY: z.string().min(1).optional(),
      GITHUB_CLIENT_ID: z.string().min(1).optional(),
      GITHUB_CLIENT_SECRET: z.string().min(1).optional(),
      GITHUB_WEBHOOK_SECRET: z.string().min(1).optional(),
      ENCRYPTION_KEY: z.string().length(32).optional(),
      APP_URL: z
        .string()
        .url()
        .default(
          process.env.NODE_ENV === "production"
            ? "https://uspark.ai"
            : "http://localhost:3000",
        ),
    },
    client: {
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
    },
    runtimeEnv: {
      DATABASE_URL: process.env.DATABASE_URL,
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
      BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
      E2B_API_KEY: process.env.E2B_API_KEY,
      GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
      GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
      GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET,
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
      APP_URL: process.env.APP_URL,
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
        process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
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
