import { setupFreshTestDb, cleanupFreshTestDb } from "./db-setup";

export async function setup() {
  console.log("Creating fresh test database...");
  await setupFreshTestDb();
}

export async function teardown() {
  console.log("Dropping test database...");
  await cleanupFreshTestDb();
}
