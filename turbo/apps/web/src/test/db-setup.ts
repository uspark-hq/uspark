import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { schema } from "../db/db";
import fs from "fs";
import path from "path";

let testDb: ReturnType<typeof drizzle<typeof schema>> | undefined;
let testSql: ReturnType<typeof postgres> | undefined;

let originalDatabaseUrl: string | undefined;
let testDbName: string | undefined;

export async function setupFreshTestDb() {
  originalDatabaseUrl = process.env.DATABASE_URL;
  if (!originalDatabaseUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  testDbName = `test_db_${timestamp}_${randomId}`;

  const adminUrl = new URL(originalDatabaseUrl);
  adminUrl.pathname = "/postgres";
  const adminSql = postgres(adminUrl.toString(), { max: 1 });
  await adminSql`CREATE DATABASE ${adminSql(testDbName)}`;
  await adminSql.end();

  const testUrl = new URL(originalDatabaseUrl);
  testUrl.pathname = `/${testDbName}`;
  process.env.DATABASE_URL = testUrl.toString();

  return await setupTestDb();
}

export async function cleanupFreshTestDb() {
  await cleanupTestDb();

  if (testDbName && originalDatabaseUrl) {
    const adminUrl = new URL(originalDatabaseUrl);
    adminUrl.pathname = "/postgres";
    const adminSql = postgres(adminUrl.toString(), { max: 1 });
    await adminSql`DROP DATABASE IF EXISTS ${adminSql(testDbName)}`;
    await adminSql.end();
  }

  if (originalDatabaseUrl) {
    process.env.DATABASE_URL = originalDatabaseUrl;
  }
}

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
