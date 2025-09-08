import { defineConfig } from "drizzle-kit";

export const DRIZZLE_MIGRATE_OUT = "./src/db/migrations";

// When DATABASE_URL is not set (e.g., during static analysis by knip),
// use a placeholder to avoid errors. The actual database operations
// will still fail if DATABASE_URL is not set when needed.
const databaseUrl =
  process.env.DATABASE_URL || "postgresql://knip:knip@localhost:5432/knip";

if (!process.env.DATABASE_URL && process.env.NODE_ENV !== "test") {
  // Only warn when not in test environment and not during static analysis
  if (
    typeof process.argv !== "undefined" &&
    !process.argv.some((arg) => arg.includes("knip"))
  ) {
    console.warn("WARNING: DATABASE_URL is not set");
  }
}

export default defineConfig({
  schema: "./src/db/schema/*",
  out: DRIZZLE_MIGRATE_OUT,
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
  strict: false,
});
