import type { UsparkConfig } from "./config.js";
import { ProjectSync } from "@uspark/core-node";

/**
 * Manages periodic synchronization of the uSpark project
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
        console.error("Periodic sync failed:", error);
      });
    }, this.config.syncInterval);

    console.error(
      `Periodic sync started (interval: ${this.config.syncInterval / 1000 / 60} minutes)`,
    );
  }

  /**
   * Stop periodic synchronization
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.error("Periodic sync stopped");
    }
  }

  /**
   * Run a single synchronization
   */
  private async syncOnce(): Promise<void> {
    if (this.isRunning) {
      console.error("Sync already in progress, skipping...");
      return;
    }

    this.isRunning = true;
    try {
      console.error(`[${new Date().toISOString()}] Starting sync...`);

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
        `[${this.lastSyncTime.toISOString()}] Sync completed successfully`,
      );
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] Sync failed:`,
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
