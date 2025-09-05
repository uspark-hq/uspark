import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

function initEnv() {
  return createEnv({
    server: {
      DATABASE_URL: z.string().min(1),
      CLERK_SECRET_KEY: z.string().min(1),
      BLOB_READ_WRITE_TOKEN: z.string().optional().default(""),
      VERCEL_BLOB_UPLOAD_URL: z.string().optional(),
      VERCEL_BLOB_URL: z.string().optional(),
    },
    client: {
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
      NEXT_PUBLIC_BLOB_URL: z.string().optional().default(""),
    },
    runtimeEnv: {
      DATABASE_URL: process.env.DATABASE_URL,
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
      BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
        process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      NEXT_PUBLIC_BLOB_URL: process.env.NEXT_PUBLIC_BLOB_URL,
      VERCEL_BLOB_UPLOAD_URL: process.env.VERCEL_BLOB_UPLOAD_URL,
      VERCEL_BLOB_URL: process.env.VERCEL_BLOB_URL,
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
