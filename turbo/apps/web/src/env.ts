import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

function initEnv() {
  return createEnv({
    server: {
      DATABASE_URL: z.string().min(1),
      CLERK_SECRET_KEY: z.string().min(1),
      BLOB_READ_WRITE_TOKEN: z.string().min(1),
      E2B_API_KEY: z.string().min(1).optional(),
      APP_URL: z
        .string()
        .url()
        .default(
          process.env.NODE_ENV === "production"
            ? "https://uspark.ai"
            : "http://localhost:3000",
        ),
      GITHUB_APP_ID: z.string().optional(),
      GITHUB_APP_PRIVATE_KEY: z.string().optional(),
      GITHUB_WEBHOOK_SECRET: z.string().optional(),
    },
    client: {
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
    },
    runtimeEnv: {
      DATABASE_URL: process.env.DATABASE_URL,
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
      BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
      E2B_API_KEY: process.env.E2B_API_KEY,
      APP_URL: process.env.APP_URL,
      GITHUB_APP_ID: process.env.GITHUB_APP_ID,
      GITHUB_APP_PRIVATE_KEY: process.env.GITHUB_APP_PRIVATE_KEY,
      GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET,
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
