import * as Y from "yjs";
import { createHash } from "crypto";
import type { FileNode, BlobInfo } from "@uspark/core";

export class FileSystem {
  private ydoc: Y.Doc;
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
  }

  getUpdate(): Uint8Array {
    // Return the full state as an update (relative to empty state)
    return Y.encodeStateAsUpdate(this.ydoc);
  }

  private async computeHash(bytes: Uint8Array): Promise<string> {
    // Always use Node.js crypto for consistency
    return createHash("sha256").update(bytes).digest("hex");
  }
}
