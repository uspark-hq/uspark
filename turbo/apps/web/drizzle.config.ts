import { defineConfig } from "drizzle-kit";

export const DRIZZLE_MIGRATE_OUT = "./src/db/migrations";

// Allow missing DATABASE_URL for static analysis tools like knip
const databaseUrl = process.env.DATABASE_URL || "postgresql://placeholder:placeholder@localhost:5432/placeholder";

if (!process.env.DATABASE_URL && process.env.NODE_ENV !== "test" && !process.env.CI) {
  console.warn("WARNING: DATABASE_URL is not set, using placeholder value");
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
