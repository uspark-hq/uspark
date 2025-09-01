import { defineConfig } from "drizzle-kit";
import { env } from "./src/env";

export const DRIZZLE_MIGRATE_OUT = "./src/db/migrations";

export default defineConfig({
  schema: "./src/db/schema/*",
  out: DRIZZLE_MIGRATE_OUT,
  dialect: "postgresql",
  dbCredentials: {
    url: env().DATABASE_URL,
  },
  verbose: true,
  strict: false,
});
