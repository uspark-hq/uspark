import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { schema } from "../db/db";
import fs from "fs";
import path from "path";

let testDb: ReturnType<typeof drizzle<typeof schema>> | undefined;
let testSql: ReturnType<typeof postgres> | undefined;

export async function setupTestDb() {
  if (testDb) {
    return testDb;
  }

  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  testSql = postgres(DATABASE_URL, { max: 1 });
  testDb = drizzle(testSql, { schema });

  // Run migrations
  const migrationsPath = path.join(__dirname, "../db/migrations");
  if (fs.existsSync(migrationsPath)) {
    await migrate(testDb, { migrationsFolder: migrationsPath });
  }

  return testDb;
}

export async function cleanupTestDb() {
  if (testSql) {
    await testSql.end();
    testSql = undefined;
    testDb = undefined;
  }
}

export function getTestDb() {
  if (!testDb) {
    throw new Error("Test database not initialized. Call setupTestDb() first.");
  }
  return testDb;
}
