import { DocStore, generateContentHash } from "@uspark/core";
import { getBlobStorage } from "./blob/factory";
import * as fs from "node:fs/promises";
import * as path from "node:path";

interface NodeFsDocStoreConfig {
  projectId: string;
  token: string;
  localDir: string;
  baseUrl?: string;
}

interface LocalConfig {
  projectId: string;
  version: number;
  snapshot?: string; // Base64 encoded YJS state
}

interface FileInfo {
  hash: string;
  size: number;
  mtime: number;
}

const CONFIG_FILENAME = ".config.json";

export class NodeFsDocStore {
  private docStore: DocStore;
  private localDir: string;
  private projectId: string;

  constructor(config: NodeFsDocStoreConfig) {
    this.docStore = new DocStore({
      projectId: config.projectId,
      token: config.token,
      baseUrl: config.baseUrl,
    });
    this.localDir = config.localDir;
    this.projectId = config.projectId;
  }

  /**
   * Load and validate local configuration
   * Throws if config file doesn't exist or is invalid
   */
  private async loadConfig(): Promise<LocalConfig> {
    const configPath = path.join(this.localDir, CONFIG_FILENAME);

    const content = await fs.readFile(configPath, "utf-8");
    const config = JSON.parse(content) as LocalConfig;

    if (!config.projectId) {
      throw new Error("projectId missing in .config.json");
    }

    return config;
  }

  /**
   * Load snapshot from config and apply to DocStore
   * Throws on any error
   */
  private loadSnapshot(config: LocalConfig): void {
    if (config.snapshot) {
      const snapshotBuffer = Buffer.from(config.snapshot, "base64");
      this.docStore.load(new Uint8Array(snapshotBuffer));
    }
  }

  /**
   * Recursively scan local directory for files
   * Throws on any file system error
   */
  private async scanLocalFiles(): Promise<Map<string, FileInfo>> {
    const files = new Map<string, FileInfo>();

    const scanDir = async (dir: string): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(this.localDir, fullPath);

        // Skip config file
        if (relativePath === CONFIG_FILENAME) {
          continue;
        }

        if (entry.isDirectory()) {
          await scanDir(fullPath);
        } else if (entry.isFile()) {
          const content = await fs.readFile(fullPath);
          const hash = generateContentHash(content);
          const stats = await fs.stat(fullPath);

          files.set(relativePath, {
            hash,
            size: content.length,
            mtime: stats.mtimeMs,
          });
        }
      }
    };

    await scanDir(this.localDir);
    return files;
  }

  /**
   * Apply local file changes to DocStore
   * - Upload new/modified files to blob storage
   * - Update DocStore with new file metadata
   * - Delete files that no longer exist locally
   * Throws on any error
   */
  private async applyLocalChanges(
    localFiles: Map<string, FileInfo>,
  ): Promise<void> {
    const blobStorage = getBlobStorage();
    const snapshotFiles = this.docStore.getAllFiles();

    // Upload new/modified files
    for (const [filePath, fileInfo] of localFiles) {
      const snapshotFile = snapshotFiles.get(filePath);

      // File is new or modified
      if (!snapshotFile || snapshotFile.hash !== fileInfo.hash) {
        const fullPath = path.join(this.localDir, filePath);
        const content = await fs.readFile(fullPath);

        // Upload to blob storage
        const hash = await blobStorage.uploadBlob(content);

        // Update DocStore
        this.docStore.setFile(filePath, hash, fileInfo.size);
      }
    }

    // Delete files that no longer exist locally
    for (const [filePath] of snapshotFiles) {
      if (!localFiles.has(filePath)) {
        this.docStore.deleteFile(filePath);
      }
    }
  }

  /**
   * Sync DocStore state to local filesystem
   * - Download new/modified files from blob storage
   * - Delete files that no longer exist in DocStore
   * Throws on any error
   */
  private async syncToLocal(): Promise<void> {
    const blobStorage = getBlobStorage();
    const docStoreFiles = this.docStore.getAllFiles();
    const localFiles = await this.scanLocalFiles();

    // Download new/modified files
    for (const [filePath, fileNode] of docStoreFiles) {
      const localFile = localFiles.get(filePath);

      // File is new or hash differs
      if (!localFile || localFile.hash !== fileNode.hash) {
        // Download from blob storage
        const content = await blobStorage.downloadBlob(fileNode.hash);

        // Write to local filesystem
        const fullPath = path.join(this.localDir, filePath);
        const dir = path.dirname(fullPath);

        // Create parent directories if needed
        await fs.mkdir(dir, { recursive: true });

        // Write file
        await fs.writeFile(fullPath, content);
      }
    }

    // Delete files that no longer exist in DocStore
    for (const [filePath] of localFiles) {
      if (!docStoreFiles.has(filePath)) {
        const fullPath = path.join(this.localDir, filePath);
        await fs.unlink(fullPath);
      }
    }
  }

  /**
   * Save current DocStore state to local config
   * Throws on write error
   */
  private async saveConfig(): Promise<void> {
    const configPath = path.join(this.localDir, CONFIG_FILENAME);

    // Get current version from DocStore
    const version = this.docStore.getVersion();

    // Dump DocStore state
    const snapshot = this.docStore.dump();
    const snapshotBase64 = Buffer.from(snapshot).toString("base64");

    const config: LocalConfig = {
      projectId: this.projectId,
      version,
      snapshot: snapshotBase64,
    };

    await fs.writeFile(configPath, JSON.stringify(config, null, 2), "utf-8");
  }

  /**
   * Three-phase sync process:
   * 1. Local-first: Scan local files and apply changes to DocStore
   * 2. Remote sync: Sync DocStore with remote server
   * 3. Local sync: Apply merged state back to local filesystem
   *
   * Fail-fast: Any error in any phase will throw immediately
   */
  async sync(signal: AbortSignal): Promise<void> {
    // Phase 1: Local-first
    const config = await this.loadConfig();
    this.loadSnapshot(config);
    const localFiles = await this.scanLocalFiles();
    await this.applyLocalChanges(localFiles);

    // Phase 2: Remote sync
    await this.docStore.sync(signal);

    // Phase 3: Local sync
    await this.syncToLocal();

    // Save final state
    await this.saveConfig();
  }
}
