import { MemoryBlobStorage } from "./memory-blob-storage";
import { generateContentHash } from "@uspark/core";

export class BlobTestUtils {
  private storage = new MemoryBlobStorage();

  async createTestBlob(
    content: string,
    contentType?: string,
  ): Promise<{ hash: string; content: Buffer }> {
    const buffer = Buffer.from(content, "utf-8");
    const hash = await this.storage.uploadBlob(buffer, { contentType });
    return { hash, content: buffer };
  }

  async createBinaryTestBlob(
    data: number[],
  ): Promise<{ hash: string; content: Buffer }> {
    const buffer = Buffer.from(data);
    const hash = await this.storage.uploadBlob(buffer);
    return { hash, content: buffer };
  }

  async createTestFile(
    name: string,
    content: string,
  ): Promise<{
    name: string;
    hash: string;
    content: Buffer;
    size: number;
  }> {
    const { hash, content: buffer } = await this.createTestBlob(content);
    return {
      name,
      hash,
      content: buffer,
      size: buffer.length,
    };
  }

  generateTestHash(content: string): string {
    return generateContentHash(Buffer.from(content, "utf-8"));
  }

  createTestContent(size: number, pattern = "a"): Buffer {
    return Buffer.alloc(size, pattern);
  }

  createLargeTestContent(sizeMB: number): Buffer {
    const sizeBytes = sizeMB * 1024 * 1024;
    const chunk = Buffer.alloc(1024, "x"); // 1KB chunk
    const chunks: Buffer[] = [];

    for (let i = 0; i < Math.ceil(sizeBytes / 1024); i++) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks, sizeBytes);
  }

  getStorage(): MemoryBlobStorage {
    return this.storage;
  }

  clear(): void {
    this.storage.clear();
  }

  getStats(): {
    count: number;
    totalSize: number;
    hashes: string[];
  } {
    return {
      count: this.storage.size(),
      totalSize: this.storage.getTotalSize(),
      hashes: this.storage.getStoredHashes(),
    };
  }
}

// Singleton for tests
let _testUtils: BlobTestUtils | undefined;

export function getBlobTestUtils(): BlobTestUtils {
  if (!_testUtils) {
    _testUtils = new BlobTestUtils();
  }
  return _testUtils;
}

export function resetBlobTestUtils(): void {
  _testUtils?.clear();
  _testUtils = undefined;
}
