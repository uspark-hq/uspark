import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { schema } from "../db/db";
import fs from "fs";
import path from "path";

// Store per-test database instances
const testInstances = new Map<
  string,
  {
    db: ReturnType<typeof drizzle<typeof schema>>;
    sql: ReturnType<typeof postgres>;
    dbName: string;
  }
>();

function generateTestDbName(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `test_db_${timestamp}_${random}`;
}

function parseConnectionString(databaseUrl: string) {
  const url = new URL(databaseUrl);
  return {
    host: url.hostname,
    port: url.port || "5432",
    username: url.username,
    password: url.password,
    database: url.pathname.slice(1), // Remove leading slash
  };
}

function buildConnectionString(
  config: ReturnType<typeof parseConnectionString>,
  dbName?: string,
): string {
  const database = dbName || config.database;
  const password = config.password ? `:${config.password}` : "";
  return `postgresql://${config.username}${password}@${config.host}:${config.port}/${database}`;
}

/**
 * Creates a new isolated database for a specific test
 * Call this in beforeEach or beforeAll of your test file
 */
export async function createTestDatabase(testId?: string): Promise<{
  db: ReturnType<typeof drizzle<typeof schema>>;
  cleanup: () => Promise<void>;
  databaseUrl: string;
}> {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const dbConfig = parseConnectionString(DATABASE_URL);
  const testDbName = generateTestDbName();
  const instanceKey = testId || `${Date.now()}_${Math.random()}`;

  // Connect to the default database to create test database
  const adminUrl = buildConnectionString(dbConfig, "postgres");
  const adminSql = postgres(adminUrl, { max: 1 });

  try {
    // Create test database
    await adminSql.unsafe(`CREATE DATABASE "${testDbName}"`);
    console.log(`Created test database: ${testDbName}`);
  } finally {
    await adminSql.end();
  }

  // Connect to the new test database
  const testDbUrl = buildConnectionString(dbConfig, testDbName);
  const testSql = postgres(testDbUrl, { max: 1 });
  const testDb = drizzle(testSql, { schema });

  // Run migrations
  const migrationsPath = path.join(__dirname, "../db/migrations");
  if (fs.existsSync(migrationsPath)) {
    await migrate(testDb, { migrationsFolder: migrationsPath });
    console.log(`Applied migrations to test database: ${testDbName}`);
  }

  // Store instance
  testInstances.set(instanceKey, {
    db: testDb,
    sql: testSql,
    dbName: testDbName,
  });

  // Cleanup function
  const cleanup = async () => {
    const instance = testInstances.get(instanceKey);
    if (!instance) return;

    // Close connection
    await instance.sql.end();
    testInstances.delete(instanceKey);

    // Drop database
    const adminUrl = buildConnectionString(dbConfig, "postgres");
    const adminSql = postgres(adminUrl, { max: 1 });

    try {
      // Terminate existing connections to the test database
      await adminSql.unsafe(`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = '${testDbName}' AND pid <> pg_backend_pid()
      `);

      // Drop test database
      await adminSql.unsafe(`DROP DATABASE IF EXISTS "${testDbName}"`);
      console.log(`Dropped test database: ${testDbName}`);
    } finally {
      await adminSql.end();
    }
  };

  return {
    db: testDb,
    cleanup,
    databaseUrl: testDbUrl,
  };
}

/**
 * Cleanup all test databases
 * Useful for global teardown
 */
export async function cleanupAllTestDatabases() {
  const cleanupPromises = Array.from(testInstances.keys()).map(async (key) => {
    const instance = testInstances.get(key);
    if (!instance) return;

    await instance.sql.end();

    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) return;

    const dbConfig = parseConnectionString(DATABASE_URL);
    const adminUrl = buildConnectionString(dbConfig, "postgres");
    const adminSql = postgres(adminUrl, { max: 1 });

    try {
      await adminSql.unsafe(`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = '${instance.dbName}' AND pid <> pg_backend_pid()
      `);
      await adminSql.unsafe(`DROP DATABASE IF EXISTS "${instance.dbName}"`);
      console.log(`Dropped test database: ${instance.dbName}`);
    } finally {
      await adminSql.end();
    }
  });

  await Promise.all(cleanupPromises);
  testInstances.clear();
}
