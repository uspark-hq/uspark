import { FileSystem } from "./filesystem";
import { writeFile, readFile, mkdir } from "fs/promises";
import { put } from "@vercel/blob";
import { dirname, join } from "path";
import { createHash } from "crypto";

interface SyncOptions {
  token: string;
  apiUrl: string;
  verbose?: boolean;
}

export class ProjectSync {
  private fs: FileSystem;

  constructor(fs?: FileSystem) {
    this.fs = fs || new FileSystem();
  }

  private log(message: string, verbose?: boolean) {
    if (verbose) {
      console.log(message);
    }
  }

  private async computeFileHash(content: string): Promise<string> {
    return createHash("sha256").update(content).digest("hex");
  }

  private async fetchWithAuth(
    url: string,
    token: string,
    options: RequestInit = {},
  ): Promise<Response> {
    // First attempt with redirect handling disabled
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
      redirect: "manual",
    });

    // If it's a redirect, follow it manually with auth header
    if (
      response.status === 301 ||
      response.status === 302 ||
      response.status === 307 ||
      response.status === 308
    ) {
      const location = response.headers.get("location");
      if (location) {
        // Follow the redirect with the auth header preserved
        return fetch(location, {
          ...options,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${token}`,
          },
        });
      }
    }

    return response;
  }

  async syncFromRemote(projectId: string, options: SyncOptions): Promise<void> {
    const apiUrl = options.apiUrl;
    const token = options.token;

    this.log(
      `🌐 Fetching project data from: ${apiUrl}/api/projects/${projectId}`,
      options.verbose,
    );

    const response = await this.fetchWithAuth(
      `${apiUrl}/api/projects/${projectId}`,
      token,
    );

    if (!response.ok) {
      console.error(
        `❌ Failed to fetch project: ${response.status} ${response.statusText}`,
      );
      throw new Error(`Failed to fetch project: ${response.statusText}`);
    }

    this.log(
      `✅ Received project data (${response.headers.get("content-length")} bytes)`,
      options.verbose,
    );

    const buffer = await response.arrayBuffer();
    const update = new Uint8Array(buffer);

    this.log(
      `📦 Applying YJS update (${update.length} bytes)`,
      options.verbose,
    );

    // Apply update to the FileSystem's YDoc
    this.fs.applyUpdate(update);

    this.log("✅ YJS update applied successfully", options.verbose);
  }

  async syncToRemote(projectId: string, options: SyncOptions): Promise<void> {
    const apiUrl = options.apiUrl;
    const token = options.token;

    // Get incremental update from FileSystem's YDoc
    const update = this.fs.getUpdate();

    // Only sync if there are actual changes
    if (update.length === 0) {
      return; // No changes to sync
    }

    const response = await this.fetchWithAuth(
      `${apiUrl}/api/projects/${projectId}`,
      token,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/octet-stream",
        },
        body: Buffer.from(update),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to sync to remote: ${response.statusText}`);
    }

    // Mark the current state as synced
    this.fs.markAsSynced();
  }

  private async getStoreId(apiUrl: string, token: string): Promise<string> {
    const response = await this.fetchWithAuth(
      `${apiUrl}/api/blob-store`,
      token,
    );

    if (!response.ok) {
      throw new Error(`Failed to get store ID: ${response.statusText}`);
    }

    const { store_id } = (await response.json()) as { store_id: string };
    return store_id;
  }

  private getPublicBlobUrl(
    storeId: string,
    projectId: string,
    hash: string,
  ): string {
    return `https://${storeId}.public.blob.vercel-storage.com/projects/${projectId}/${hash}`;
  }

  async pullFile(
    projectId: string,
    filePath: string,
    options: SyncOptions,
    outputDir?: string,
  ): Promise<void> {
    const apiUrl = options.apiUrl;
    const token = options.token;

    // 1. Sync from remote to get latest state
    await this.syncFromRemote(projectId, options);

    // 2. Read file content from FileSystem
    const fileNode = this.fs.getFileNode(filePath);
    if (!fileNode) {
      throw new Error(`File not found in project: ${filePath}`);
    }

    // 3. Get blob content from FileSystem or fetch from remote
    let content = this.fs.getBlob(fileNode.hash);
    if (!content) {
      // Get store ID from server
      const storeId = await this.getStoreId(apiUrl, token);

      // Construct public blob URL
      const blobUrl = this.getPublicBlobUrl(storeId, projectId, fileNode.hash);

      // Fetch blob directly from Vercel Blob Storage (no auth needed for public blobs)
      const blobResponse = await fetch(blobUrl);

      if (!blobResponse.ok) {
        throw new Error(
          `Blob ${fileNode.hash} not found for ${filePath}. ` +
            `Status: ${blobResponse.status}. ` +
            `This indicates data corruption or incomplete sync. ` +
            `URL: ${blobUrl}`,
        );
      }

      content = await blobResponse.text();

      this.fs.setBlob(fileNode.hash, content);
    }

    // 4. Write to local filesystem
    const outputPath = outputDir ? join(outputDir, filePath) : filePath;
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, content, "utf8");
  }

  async pushFile(
    projectId: string,
    filePath: string,
    options: SyncOptions,
    localPath?: string,
  ): Promise<void> {
    const apiUrl = options.apiUrl;
    const token = options.token;

    // 1. Fetch remote baseline
    await this.syncFromRemote(projectId, options);

    // 2. Read local file and compute hash
    const inputPath = localPath || filePath;
    const content = await readFile(inputPath, "utf8");
    const localHash = await this.computeFileHash(content);

    // 3. Compare with remote hash
    const remoteFileNode = this.fs.getFileNode(filePath);
    if (remoteFileNode && remoteFileNode.hash === localHash) {
      // File unchanged, skip
      return;
    }

    // 4. Upload blob if not exists
    if (!this.fs.getBlobInfo(localHash)) {
      // Get client token for this specific file hash
      const tokenResponse = await this.fetchWithAuth(
        `${apiUrl}/api/projects/${projectId}/blob-token?hash=${localHash}`,
        token,
      );

      if (!tokenResponse.ok) {
        throw new Error(
          `Failed to get blob token: ${tokenResponse.statusText}`,
        );
      }

      const { token: blobToken } = (await tokenResponse.json()) as {
        token: string;
        expiresAt: string;
        uploadUrl: string;
        downloadUrlPrefix: string;
      };

      // Upload blob using exact path that matches the token
      const blobPath = `projects/${projectId}/${localHash}`;

      try {
        await put(blobPath, content, {
          access: "public",
          token: blobToken,
        });
      } catch (error) {
        // If blob already exists, skip it (this is OK)
        if (
          error instanceof Error &&
          error.message.includes("blob already exists")
        ) {
          // Blob already exists in storage, no need to re-upload
        } else {
          // Re-throw other errors
          throw error;
        }
      }

      // Store locally as well
      this.fs.setBlob(localHash, content);
    }

    // 5. Update metadata in FileSystem
    await this.fs.writeFile(filePath, content);

    // 6. Sync to remote
    await this.syncToRemote(projectId, options);
  }

  async pushFiles(
    projectId: string,
    files: Array<{ filePath: string; localPath?: string }>,
    options: SyncOptions,
  ): Promise<void> {
    const apiUrl = options.apiUrl;
    const token = options.token;

    // 1. Fetch remote baseline
    await this.syncFromRemote(projectId, options);

    // 2. Build local file map with hashes
    const localFiles = new Map<string, string>(); // path -> hash
    const contentMap = new Map<string, string>(); // hash -> content

    for (const { filePath, localPath } of files) {
      const inputPath = localPath || filePath;
      const content = await readFile(inputPath, "utf8");
      const hash = await this.computeFileHash(content);
      localFiles.set(filePath, hash);
      contentMap.set(hash, content);

      // Store content locally for later use
      if (!this.fs.getBlobInfo(hash)) {
        this.fs.setBlob(hash, content);
      }
    }

    // 3. Get remote files from YJS
    const remoteFiles = new Map<string, string>(); // path -> hash
    const allFiles = this.fs.getAllFiles();
    for (const [path, fileNode] of allFiles) {
      remoteFiles.set(path, fileNode.hash);
    }

    // 4. Three-way comparison
    const toDelete = new Set<string>();
    const toUpdate = new Set<string>();
    const toAdd = new Set<string>();

    // Find deletions (in remote but not in local)
    for (const [path] of remoteFiles) {
      if (!localFiles.has(path)) {
        toDelete.add(path);
      }
    }

    // Find additions and updates
    for (const [path, localHash] of localFiles) {
      const remoteHash = remoteFiles.get(path);
      if (!remoteHash) {
        toAdd.add(path);
      } else if (remoteHash !== localHash) {
        toUpdate.add(path);
      }
      // If hashes match, skip (no change)
    }

    // 5. Upload new/changed blobs to Vercel Blob Storage
    // Collect all unique hashes that need uploading
    const blobsToUpload = new Set<string>();
    for (const path of [...toAdd, ...toUpdate]) {
      const hash = localFiles.get(path)!;
      blobsToUpload.add(hash);
    }

    // Get existing remote hashes to avoid re-uploading
    // If a hash exists in YJS, it means the blob was already uploaded
    const existingRemoteHashes = new Set<string>();
    for (const [, remoteHash] of remoteFiles) {
      existingRemoteHashes.add(remoteHash);
    }

    // Only upload blobs that don't already exist in remote YJS
    // This prevents re-uploading the same content
    const blobsToActuallyUpload = new Set<string>();
    for (const hash of blobsToUpload) {
      if (!existingRemoteHashes.has(hash)) {
        blobsToActuallyUpload.add(hash);
      }
    }

    // Upload each blob with its own token
    for (const hash of blobsToActuallyUpload) {
      const content = contentMap.get(hash);
      if (content === undefined) {
        throw new Error(`Content not found for hash ${hash}`);
      }

      // Get client token for this specific file hash
      const tokenResponse = await this.fetchWithAuth(
        `${apiUrl}/api/projects/${projectId}/blob-token?hash=${hash}`,
        token,
      );

      if (!tokenResponse.ok) {
        throw new Error(
          `Failed to get blob token for ${hash}: ${tokenResponse.statusText}`,
        );
      }

      const { token: blobToken } = (await tokenResponse.json()) as {
        token: string;
        expiresAt: string;
        uploadUrl: string;
        downloadUrlPrefix: string;
      };

      // Upload blob using exact path that matches the token
      const blobPath = `projects/${projectId}/${hash}`;

      try {
        await put(blobPath, content, {
          access: "public",
          token: blobToken,
        });
      } catch (error) {
        // If blob already exists, skip it (this is OK)
        if (
          error instanceof Error &&
          error.message.includes("blob already exists")
        ) {
          // Blob already exists in storage, no need to re-upload
          continue;
        }
        // Re-throw other errors
        throw error;
      }
    }

    // 6. Apply changes to FileSystem
    // Delete files
    for (const path of toDelete) {
      this.fs.deleteFile(path);
    }

    // Add/Update files
    for (const path of [...toAdd, ...toUpdate]) {
      const hash = localFiles.get(path)!;
      const content = contentMap.get(hash) || this.fs.getBlob(hash)!;
      await this.fs.writeFile(path, content);
    }

    // 7. Sync everything to remote in one PATCH request
    await this.syncToRemote(projectId, options);
  }

  async pullAll(
    projectId: string,
    options: SyncOptions,
    outputDir?: string,
    prefix?: string,
  ): Promise<void> {
    const apiUrl = options.apiUrl;
    const token = options.token;

    this.log(`📦 Starting pull for project: ${projectId}`, options.verbose);
    if (prefix) {
      this.log(`📂 Filtering files with prefix: ${prefix}`, options.verbose);
    }

    // 1. Sync from remote to get latest state
    this.log("🔄 Syncing from remote...", options.verbose);
    await this.syncFromRemote(projectId, options);

    // 2. Get all files from the YJS document
    this.log("📁 Getting all files from YJS document...", options.verbose);
    const allFilesMap = this.fs.getAllFiles();

    // Filter files by prefix if specified
    const allFiles = prefix
      ? new Map(
          Array.from(allFilesMap).filter(
            ([filePath]) =>
              filePath.startsWith(prefix + "/") || filePath === prefix,
          ),
        )
      : allFilesMap;

    this.log(`📊 Found ${allFiles.size} files in project`, options.verbose);

    if (allFiles.size === 0) {
      console.log("ℹ️  No files found in project");
      // Create output directory even when there are no files
      if (outputDir) {
        await mkdir(outputDir, { recursive: true });
      }
      return;
    }

    // 3. Get store ID once for all files
    this.log("🔑 Getting store ID...", options.verbose);
    const storeId = await this.getStoreId(apiUrl, token);
    this.log(`🏪 Store ID: ${storeId}`, options.verbose);

    // 4. Download all files - fail fast on any error
    this.log("⬇️  Starting file downloads...", options.verbose);
    for (const [filePath, fileNode] of allFiles) {
      this.log(
        `📄 Processing file: ${filePath} (hash: ${fileNode.hash})`,
        options.verbose,
      );

      // Get blob content from FileSystem or fetch from remote
      let content = this.fs.getBlob(fileNode.hash);
      if (!content) {
        // Construct public blob URL
        const blobUrl = this.getPublicBlobUrl(
          storeId,
          projectId,
          fileNode.hash,
        );
        this.log(`🌐 Fetching from: ${blobUrl}`, options.verbose);

        // Fetch blob directly from Vercel Blob Storage (no auth needed for public blobs)
        const blobResponse = await fetch(blobUrl);

        if (!blobResponse.ok) {
          throw new Error(
            `Blob ${fileNode.hash} not found for ${filePath}. ` +
              `Status: ${blobResponse.status}. ` +
              `This indicates data corruption or incomplete sync. ` +
              `URL: ${blobUrl}`,
          );
        }

        content = await blobResponse.text();
        this.log(
          `✅ Downloaded ${content.length} bytes for ${filePath}`,
          options.verbose,
        );

        this.fs.setBlob(fileNode.hash, content);
      } else {
        this.log(`💾 Using cached content for ${filePath}`, options.verbose);
      }

      // Write to local filesystem
      const localPath = outputDir ? join(outputDir, filePath) : filePath;
      this.log(`💾 Writing to: ${localPath}`, options.verbose);
      await mkdir(dirname(localPath), { recursive: true });
      await writeFile(localPath, content, "utf8");

      // Always show progress for each file
      console.log(`✓ ${filePath}`);
    }

    console.log(`🎉 Successfully pulled ${allFiles.size} files`);
  }

  /**
   * Get all files from the filesystem
   */
  getAllFiles(): Map<string, { hash: string; mtime: number }> {
    return this.fs.getAllFiles();
  }
}
