import * as Y from "yjs";
import { createHash } from "crypto";
import type { FileNode, BlobInfo, BlobStore } from "@uspark/core";

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

  getFileNode(path: string): FileNode | undefined {
    return this.files.get(path);
  }

  getBlobInfo(hash: string): BlobInfo | undefined {
    return this.blobs.get(hash);
  }

  getBlob(hash: string): string | undefined {
    return this.blobStore.get(hash);
  }

  setBlob(hash: string, content: string): void {
    this.blobStore.set(hash, content);
  }

  applyUpdate(update: Uint8Array): void {
    Y.applyUpdate(this.ydoc, update);
  }

  getUpdate(): Uint8Array {
    const stateVector = Y.encodeStateVector(this.ydoc);
    return Y.encodeStateAsUpdate(this.ydoc, stateVector);
  }

  getAllFiles(): Map<string, FileNode> {
    const allFiles = new Map<string, FileNode>();
    this.files.forEach((fileNode, path) => {
      allFiles.set(path, fileNode);
    });
    return allFiles;
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
