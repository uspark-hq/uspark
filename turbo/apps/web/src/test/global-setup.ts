import { setupTestDb, cleanupTestDb } from "./db-setup";

export async function setup() {
  console.log("Setting up test database...");
  await setupTestDb();
}

export async function teardown() {
  console.log("Cleaning up test database...");
  await cleanupTestDb();
}
