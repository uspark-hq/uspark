import * as Y from "yjs";
import { createHash } from "crypto";
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

  private async computeHash(bytes: Uint8Array): Promise<string> {
    // Use Web Crypto API when available (browsers), fallback to Node.js crypto
    if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
      const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', bytes);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
      // Node.js fallback using static import
      return createHash("sha256").update(bytes).digest("hex");
    }
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
