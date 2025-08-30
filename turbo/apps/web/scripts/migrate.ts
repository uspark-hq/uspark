#!/usr/bin/env tsx

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { DRIZZLE_MIGRATE_OUT } from "../drizzle.config";
import { env } from "../src/env";

async function runMigrations() {
  const sql = postgres(env().DATABASE_URL, { max: 1 });
  const db = drizzle(sql);

  try {
    await migrate(db, {
      migrationsFolder: DRIZZLE_MIGRATE_OUT,
    });
  } finally {
    await sql.end();
  }
}

await runMigrations();
