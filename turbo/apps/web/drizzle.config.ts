import { defineConfig } from "drizzle-kit";

export const DRIZZLE_MIGRATE_OUT = "./src/db/migrations";

if (!process.env.DATABASE_URL) {
  throw new Error("invalid DATABASE_URL");
}

export default defineConfig({
  schema: "./src/db/schema/*",
  out: DRIZZLE_MIGRATE_OUT,
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: false,
});
