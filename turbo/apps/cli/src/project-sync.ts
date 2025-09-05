import { FileSystem } from "./fs";
import { writeFile, readFile, mkdir } from "fs/promises";
import { dirname } from "path";
import { createHash } from "crypto";

export interface SyncOptions {
  token: string;
  apiUrl: string;
}

export class ProjectSync {
  private fs: FileSystem;

  constructor(fs?: FileSystem) {
    this.fs = fs || new FileSystem();
  }

  private async computeFileHash(content: string): Promise<string> {
    return createHash("sha256").update(content, "utf8").digest("hex");
  }

  async syncFromRemote(
    projectId: string,
    options: SyncOptions,
  ): Promise<void> {
    const apiUrl = options.apiUrl;
    const token = options.token;

    const response = await fetch(`${apiUrl}/api/projects/${projectId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch project: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    const update = new Uint8Array(buffer);

    // Apply update to the FileSystem's YDoc
    this.fs.applyUpdate(update);
  }

  async syncToRemote(projectId: string, options: SyncOptions): Promise<void> {
    const apiUrl = options.apiUrl;
    const token = options.token;

    // Get update from FileSystem's YDoc
    const update = this.fs.getUpdate();

    const response = await fetch(`${apiUrl}/api/projects/${projectId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/octet-stream",
        Authorization: `Bearer ${token}`,
      },
      body: Buffer.from(update),
    });

    if (!response.ok) {
      throw new Error(`Failed to sync to remote: ${response.statusText}`);
    }
  }

  async pullFile(
    projectId: string,
    filePath: string,
    options: SyncOptions,
    localPath?: string,
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
      // Get STS token for blob access
      const tokenResponse = await fetch(
        `${apiUrl}/api/projects/${projectId}/blob-token`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!tokenResponse.ok) {
        throw new Error(
          `Failed to get blob token: ${tokenResponse.statusText}`,
        );
      }

      const { downloadUrlPrefix, token: blobToken } =
        (await tokenResponse.json()) as {
          token: string;
          expiresAt: string;
          uploadUrl: string;
          downloadUrlPrefix: string;
        };

      // Fetch blob directly from Vercel Blob Storage
      const blobResponse = await fetch(
        `${downloadUrlPrefix}/${fileNode.hash}`,
        {
          headers: {
            Authorization: `Bearer ${blobToken}`,
          },
        },
      );

      if (!blobResponse.ok) {
        // Fallback: blob might not be uploaded yet, use empty content
        console.warn(`Blob ${fileNode.hash} not found, using empty content`);
        content = "";
      } else {
        content = await blobResponse.text();
      }

      this.fs.setBlob(fileNode.hash, content);
    }

    // 4. Write to local filesystem
    const outputPath = localPath || filePath;
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
      // Get STS token for blob access
      const tokenResponse = await fetch(
        `${apiUrl}/api/projects/${projectId}/blob-token`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!tokenResponse.ok) {
        throw new Error(
          `Failed to get blob token: ${tokenResponse.statusText}`,
        );
      }

      const { uploadUrl, token: blobToken } = (await tokenResponse.json()) as {
        token: string;
        expiresAt: string;
        uploadUrl: string;
        downloadUrlPrefix: string;
      };

      // Upload blob directly to Vercel Blob Storage
      const uploadResponse = await fetch(`${uploadUrl}/${localHash}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${blobToken}`,
          "Content-Type": "text/plain",
        },
        body: content,
      });

      if (!uploadResponse.ok) {
        console.warn(`Failed to upload blob ${localHash}, continuing anyway`);
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
    const blobsToUpload = new Set<string>();
    for (const path of [...toAdd, ...toUpdate]) {
      const hash = localFiles.get(path)!;
      if (!this.fs.getBlobInfo(hash)) {
        blobsToUpload.add(hash);
      }
    }

    if (blobsToUpload.size > 0) {
      // Get STS token for blob access
      const tokenResponse = await fetch(
        `${apiUrl}/api/projects/${projectId}/blob-token`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (tokenResponse.ok) {
        const { uploadUrl, token: blobToken } =
          (await tokenResponse.json()) as {
            token: string;
            expiresAt: string;
            uploadUrl: string;
            downloadUrlPrefix: string;
          };

        // Upload all new blobs
        for (const hash of blobsToUpload) {
          const content = contentMap.get(hash);
          if (content) {
            const uploadResponse = await fetch(`${uploadUrl}/${hash}`, {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${blobToken}`,
                "Content-Type": "text/plain",
              },
              body: content,
            });

            if (!uploadResponse.ok) {
              console.warn(`Failed to upload blob ${hash}, continuing anyway`);
            }
          }
        }
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
}
