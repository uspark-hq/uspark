import * as Y from "yjs";
import { sha256 } from "js-sha256";
import type { FileNode, BlobInfo } from "@uspark/core";

export class FileSystem {
  private ydoc: Y.Doc;
  private baseDoc: Y.Doc | null = null; // Track the base state from server
  private files: Y.Map<FileNode>;
  private blobs: Y.Map<BlobInfo>;
  private blobCache: Map<string, string>;

  constructor() {
    this.ydoc = new Y.Doc();
    this.files = this.ydoc.getMap("files");
    this.blobs = this.ydoc.getMap("blobs");
    this.blobCache = new Map();
  }

  getFilesMap(): Y.Map<FileNode> {
    return this.files;
  }

  getBlobsMap(): Y.Map<BlobInfo> {
    return this.blobs;
  }

  getAllFiles(): Map<string, FileNode> {
    const result = new Map<string, FileNode>();
    this.files.forEach((node, path) => {
      if (typeof path === "string") {
        result.set(path, node);
      }
    });
    return result;
  }

  deleteFile(path: string): void {
    this.files.delete(path);
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

      // Cache content locally for immediate access
      this.blobCache.set(hash, content);
    }
  }

  readFile(path: string): string {
    const fileNode = this.files.get(path);
    if (!fileNode) {
      throw new Error(`File not found: ${path}`);
    }

    const content = this.blobCache.get(fileNode.hash);
    if (!content) {
      throw new Error(`Content not found for hash: ${fileNode.hash}`);
    }

    return content;
  }

  getFileNode(path: string): FileNode | undefined {
    return this.files.get(path);
  }

  getBlobInfo(hash: string): BlobInfo | undefined {
    return this.blobs.get(hash);
  }

  getBlob(hash: string): string | undefined {
    return this.blobCache.get(hash);
  }

  setBlob(hash: string, content: string): void {
    this.blobCache.set(hash, content);
  }

  applyUpdate(update: Uint8Array): void {
    Y.applyUpdate(this.ydoc, update);

    // Also update the base document to track server state
    if (!this.baseDoc) {
      this.baseDoc = new Y.Doc();
    }
    Y.applyUpdate(this.baseDoc, update);
  }

  getUpdate(): Uint8Array {
    if (!this.baseDoc) {
      // If no base document, return full state
      return Y.encodeStateAsUpdate(this.ydoc);
    }

    // Compute the difference between current state and base state
    const baseStateVector = Y.encodeStateVector(this.baseDoc);
    return Y.encodeStateAsUpdate(this.ydoc, baseStateVector);
  }

  /**
   * Mark the current state as synced with the server
   */
  markAsSynced(): void {
    if (!this.baseDoc) {
      this.baseDoc = new Y.Doc();
    }
    // Update base document to match current state
    const currentState = Y.encodeStateAsUpdate(this.ydoc);
    Y.applyUpdate(this.baseDoc, currentState);
  }

  private async computeHash(bytes: Uint8Array): Promise<string> {
    // Use js-sha256 for consistency and browser compatibility
    return sha256(bytes);
  }
}
