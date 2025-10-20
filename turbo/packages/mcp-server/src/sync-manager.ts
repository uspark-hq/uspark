import type { UsparkConfig } from "./config.js";
import { ProjectSync } from "@uspark/core-node";

/**
 * Manages periodic synchronization of the uSpark project
 *
 * Note: MCP servers use stdout for protocol communication,
 * so all diagnostic logs must go to stderr (console.error).
 * We use prefixes to distinguish log levels: [INFO], [WARN], [ERROR]
 */
export class SyncManager {
  private config: UsparkConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private lastSyncTime: Date | null = null;
  private isRunning = false;

  constructor(config: UsparkConfig) {
    this.config = config;
  }

  /**
   * Start periodic synchronization
   */
  async start(): Promise<void> {
    // Run initial sync
    await this.syncOnce();

    // Start periodic sync
    this.intervalId = setInterval(() => {
      this.syncOnce().catch((error) => {
        console.error("[ERROR] Periodic sync failed:", error);
      });
    }, this.config.syncInterval);

    console.error(
      `[INFO] Periodic sync started (interval: ${this.config.syncInterval / 1000 / 60} minutes)`,
    );
  }

  /**
   * Stop periodic synchronization
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.error("[INFO] Periodic sync stopped");
    }
  }

  /**
   * Run a single synchronization
   */
  private async syncOnce(): Promise<void> {
    if (this.isRunning) {
      console.error("[WARN] Sync already in progress, skipping...");
      return;
    }

    this.isRunning = true;
    try {
      console.error(`[INFO] [${new Date().toISOString()}] Starting sync...`);

      const sync = new ProjectSync();
      await sync.pullAll(
        this.config.projectId,
        {
          token: this.config.token,
          apiUrl: this.config.apiUrl,
          verbose: false,
        },
        this.config.outputDir,
      );

      this.lastSyncTime = new Date();
      console.error(
        `[INFO] [${this.lastSyncTime.toISOString()}] Sync completed successfully`,
      );
    } catch (error) {
      console.error(
        `[ERROR] [${new Date().toISOString()}] Sync failed:`,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get the last sync time
   */
  getLastSyncTime(): Date | null {
    return this.lastSyncTime;
  }
}
