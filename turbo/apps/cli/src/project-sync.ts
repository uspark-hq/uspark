import { FileSystem } from "./fs";
import { writeFile, readFile, mkdir } from "fs/promises";
import { dirname } from "path";

export interface SyncOptions {
  token?: string;
  apiUrl?: string;
}

export class ProjectSync {
  private fs: FileSystem;
  
  constructor(fs?: FileSystem) {
    this.fs = fs || new FileSystem();
  }

  async syncFromRemote(
    projectId: string,
    options?: SyncOptions
  ): Promise<void> {
    const apiUrl = options?.apiUrl || "http://localhost:3000";
    const token = options?.token || "test_token";
    
    const response = await fetch(
      `${apiUrl}/api/projects/${projectId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch project: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    const update = new Uint8Array(buffer);

    // Apply update to the FileSystem's YDoc
    this.fs.applyUpdate(update);
  }

  async syncToRemote(
    projectId: string,
    options?: SyncOptions
  ): Promise<void> {
    const apiUrl = options?.apiUrl || "http://localhost:3000";
    const token = options?.token || "test_token";
    
    // Get update from FileSystem's YDoc
    const update = this.fs.getUpdate();

    const response = await fetch(
      `${apiUrl}/api/projects/${projectId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/octet-stream",
          Authorization: `Bearer ${token}`,
        },
        body: Buffer.from(update),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to sync to remote: ${response.statusText}`);
    }
  }

  async pullFile(
    projectId: string,
    filePath: string,
    localPath?: string,
    options?: SyncOptions
  ): Promise<void> {
    const apiUrl = options?.apiUrl || "http://localhost:3000";
    const token = options?.token || "test_token";
    
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
      // Try to fetch from remote blob storage
      const response = await fetch(
        `${apiUrl}/api/blobs/${fileNode.hash}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch blob content: ${response.statusText}`);
      }

      content = await response.text();
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
    localPath?: string,
    options?: SyncOptions
  ): Promise<void> {
    // 1. Read from local filesystem
    const inputPath = localPath || filePath;
    const content = await readFile(inputPath, "utf8");

    // 2. Update FileSystem
    await this.fs.writeFile(filePath, content);

    // 3. Sync to remote
    await this.syncToRemote(projectId, options);
  }
}