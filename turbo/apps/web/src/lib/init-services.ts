import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { schema } from "../db/db";
import { env, type Env } from "../env";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Services } from "../types/global";

// Private variables for singleton instances
let _env: Env | undefined;
let _pool: Pool | undefined;
let _db: NodePgDatabase<typeof schema> | undefined;
let _services: Services | undefined;

/**
 * Initialize global services
 * Call this at the entry point of serverless functions
 *
 * @example
 * // In API Route
 * export async function GET() {
 *   initServices();
 *   const users = await services.db.select().from(users);
 * }
 */
export function initServices(): void {
  // Already initialized
  if (_services) {
    return;
  }

  // In test environment, set default values if not already set
  if (process.env.NODE_ENV === "test") {
    if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY =
        "pk_test_mock_instance.clerk.accounts.dev$";
    }
    if (!process.env.CLERK_SECRET_KEY) {
      process.env.CLERK_SECRET_KEY = "sk_test_mock_secret_key_for_testing";
    }
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      process.env.BLOB_READ_WRITE_TOKEN =
        "vercel_blob_rw_test-store_secret-key";
    }
    if (!process.env.GH_APP_ID) {
      process.env.GH_APP_ID = "test_github_app_id";
    }
    if (!process.env.GH_APP_PRIVATE_KEY) {
      process.env.GH_APP_PRIVATE_KEY = "test_private_key_placeholder";
    }
    if (!process.env.GH_WEBHOOK_SECRET) {
      process.env.GH_WEBHOOK_SECRET = "test_github_webhook_secret";
    }
  }

  _services = {
    get env() {
      if (!_env) {
        _env = env();
      }
      return _env;
    },
    get pool() {
      if (!_pool) {
        _pool = new Pool({
          connectionString: this.env.DATABASE_URL,
          max: 1,
          idleTimeoutMillis: 10000,
          connectionTimeoutMillis: 10000,
        });
      }
      return _pool;
    },
    get db() {
      if (!_db) {
        _db = drizzle(this.pool, { schema });
      }
      return _db;
    },
  };

  // Define getter on globalThis to ensure services is always available after init
  Object.defineProperty(globalThis, "services", {
    get() {
      if (!_services) {
        throw new Error("Services not initialized. Call initServices() first.");
      }
      return _services;
    },
    configurable: true,
  });
}
