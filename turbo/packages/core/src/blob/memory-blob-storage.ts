import type {
  BlobStorageProvider,
  BlobMetadata,
  UploadOptions,
  ListOptions,
} from "./types";
import { BlobNotFoundError } from "./types";
import { generateContentHash, detectContentType } from "./utils";

interface StoredBlob {
  content: Buffer;
  metadata: BlobMetadata;
}

export class MemoryBlobStorage implements BlobStorageProvider {
  private store = new Map<string, StoredBlob>();

  async uploadBlob(
    content: Buffer,
    options: UploadOptions = {},
  ): Promise<string> {
    const hash = generateContentHash(content);

    // Check if already exists (deduplication)
    if (this.store.has(hash)) {
      return hash;
    }

    const contentType = options.contentType ?? detectContentType(content);

    const metadata: BlobMetadata = {
      hash,
      size: content.length,
      contentType,
      uploadedAt: new Date(),
      url: `memory://blob/${hash}`,
    };

    this.store.set(hash, {
      content: Buffer.from(content), // Create a copy
      metadata,
    });

    return hash;
  }

  async downloadBlob(hash: string): Promise<Buffer> {
    const stored = this.store.get(hash);
    if (!stored) {
      throw new BlobNotFoundError(hash);
    }

    return Buffer.from(stored.content); // Return a copy
  }

  async exists(hash: string): Promise<boolean> {
    return this.store.has(hash);
  }

  async delete(hash: string): Promise<void> {
    this.store.delete(hash);
  }

  async list(options: ListOptions = {}): Promise<BlobMetadata[]> {
    let results = Array.from(this.store.values()).map((stored) => ({
      ...stored.metadata,
    }));

    // Apply prefix filter
    if (options.prefix) {
      results = results.filter((blob) => blob.hash.startsWith(options.prefix!));
    }

    // Sort by upload date (most recent first)
    results.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());

    // Apply limit
    if (options.limit && options.limit > 0) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  // Test utilities
  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }

  getStoredHashes(): string[] {
    return Array.from(this.store.keys());
  }

  getTotalSize(): number {
    return Array.from(this.store.values()).reduce(
      (sum, stored) => sum + stored.metadata.size,
      0,
    );
  }
}
