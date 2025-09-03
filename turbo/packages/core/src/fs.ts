import * as Y from "yjs";
import { createHash } from "crypto";
import { writeFile, readFile, mkdir } from "fs/promises";
import { dirname } from "path";
import type { FileNode, BlobInfo, BlobStore } from "./types";

export class FileSystem {
  private ydoc: Y.Doc;
  private files: Y.Map<FileNode>;
  private blobs: Y.Map<BlobInfo>;
  private blobStore: BlobStore;

  constructor(blobStore?: BlobStore) {
    this.ydoc = new Y.Doc();
    this.files = this.ydoc.getMap("files");
    this.blobs = this.ydoc.getMap("blobs");

    // Mock blob store for now
    this.blobStore = blobStore || new MockBlobStore();
  }

  async writeFile(path: string, content: string): Promise<void> {
    const bytes = new TextEncoder().encode(content);
    const hash = await this.computeHash(bytes);

    // Store file metadata
    const fileNode: FileNode = {
      hash,
      mtime: Date.now(),
    };
    this.files.set(path, fileNode);

    // Store blob metadata (only if new)
    if (!this.blobs.has(hash)) {
      const blobInfo: BlobInfo = {
        size: bytes.length,
      };
      this.blobs.set(hash, blobInfo);

      // Store actual content
      this.blobStore.set(hash, content);
    }
  }

  readFile(path: string): string {
    const fileNode = this.files.get(path);
    if (!fileNode) {
      throw new Error(`File not found: ${path}`);
    }

    const content = this.blobStore.get(fileNode.hash);
    if (!content) {
      throw new Error(`Content not found for hash: ${fileNode.hash}`);
    }

    return content;
  }

  getFileNode(path: string): FileNode {
    const fileNode = this.files.get(path);
    if (!fileNode) {
      throw new Error(`File not found: ${path}`);
    }
    return fileNode;
  }

  getBlobInfo(hash: string): BlobInfo {
    const blobInfo = this.blobs.get(hash);
    if (!blobInfo) {
      throw new Error(`Blob not found: ${hash}`);
    }
    return blobInfo;
  }

  async syncFromRemote(projectId: string): Promise<void> {
    const response = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
      headers: {
        'Authorization': 'Bearer test_token', // TODO: use real auth
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch project: ${response.statusText}`);
    }
    
    const buffer = await response.arrayBuffer();
    const update = new Uint8Array(buffer);
    
    Y.applyUpdate(this.ydoc, update);
  }

  async syncToRemote(projectId: string): Promise<void> {
    // Get current state vector to generate minimal update
    const stateVector = Y.encodeStateVector(this.ydoc);
    const update = Y.encodeStateAsUpdate(this.ydoc, stateVector);
    
    const response = await fetch(`http://localhost:3000/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Authorization': 'Bearer test_token', // TODO: use real auth
      },
      body: Buffer.from(update),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to sync to remote: ${response.statusText}`);
    }
  }

  async pullFile(projectId: string, filePath: string, localPath?: string): Promise<void> {
    // 1. Sync from remote to get latest state
    await this.syncFromRemote(projectId);
    
    // 2. Read file content from YDoc
    const fileNode = this.files.get(filePath);
    if (!fileNode) {
      throw new Error(`File not found in project: ${filePath}`);
    }
    
    // 3. Get blob content
    const content = this.blobStore.get(fileNode.hash);
    if (!content) {
      // Try to fetch from remote blob storage
      const response = await fetch(`http://localhost:3000/api/blobs/${fileNode.hash}`, {
        headers: {
          'Authorization': 'Bearer test_token', // TODO: use real auth
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch blob content: ${response.statusText}`);
      }
      
      const blobContent = await response.text();
      this.blobStore.set(fileNode.hash, blobContent);
      
      // 4. Write to local filesystem
      const outputPath = localPath || filePath;
      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, blobContent, 'utf8');
      return;
    }
    
    // 4. Write to local filesystem
    const outputPath = localPath || filePath;
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, content, 'utf8');
  }

  async pushFile(projectId: string, filePath: string, localPath?: string): Promise<void> {
    // 1. Read from local filesystem
    const inputPath = localPath || filePath;
    const content = await readFile(inputPath, 'utf8');
    
    // 2. Update YDoc using existing writeFile method
    await this.writeFile(filePath, content);
    
    // 3. Sync to remote
    await this.syncToRemote(projectId);
  }

  private async computeHash(bytes: Uint8Array): Promise<string> {
    // Always use Node.js crypto for consistency
    return createHash("sha256").update(bytes).digest("hex");
  }
}

class MockBlobStore implements BlobStore {
  private store = new Map<string, string>();

  get(hash: string): string | undefined {
    return this.store.get(hash);
  }

  set(hash: string, content: string): void {
    this.store.set(hash, content);
  }
}
