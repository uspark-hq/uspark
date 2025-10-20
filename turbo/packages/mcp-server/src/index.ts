import { loadConfig } from "./config.js";
import { startServer } from "./server.js";
import { SyncManager } from "./sync-manager.js";

/**
 * MCP server entry point
 *
 * Note: MCP servers use stdout for protocol communication,
 * so all diagnostic logs must go to stderr (console.error).
 */
async function main() {
  try {
    // Load configuration from environment variables
    const config = loadConfig();

    // Start MCP server first
    await startServer(config);

    // Start periodic sync manager (non-blocking)
    // If initial sync fails, server will still run
    const syncManager = new SyncManager(config);
    syncManager.start().catch((error) => {
      console.error("[WARN] Initial sync failed, will retry on next interval:");
      console.error(error instanceof Error ? error.message : String(error));
    });
  } catch (error) {
    console.error("[ERROR] Failed to start uSpark MCP server:");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
