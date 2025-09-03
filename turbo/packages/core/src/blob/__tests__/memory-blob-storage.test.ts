import { describe, it, expect, beforeEach } from "vitest";
import { MemoryBlobStorage } from "../memory-blob-storage";
import { BlobNotFoundError } from "../types";

describe("MemoryBlobStorage", () => {
  let storage: MemoryBlobStorage;

  beforeEach(() => {
    storage = new MemoryBlobStorage();
  });

  describe("uploadBlob", () => {
    it("should upload and return content hash", async () => {
      const content = Buffer.from("Hello World");
      const hash = await storage.uploadBlob(content);

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
      expect(await storage.exists(hash)).toBe(true);
    });

    it("should deduplicate identical content", async () => {
      const content1 = Buffer.from("Same content");
      const content2 = Buffer.from("Same content");

      const hash1 = await storage.uploadBlob(content1);
      const hash2 = await storage.uploadBlob(content2);

      expect(hash1).toBe(hash2);
      expect(storage.size()).toBe(1);
    });

    it("should store different content separately", async () => {
      const content1 = Buffer.from("Content 1");
      const content2 = Buffer.from("Content 2");

      const hash1 = await storage.uploadBlob(content1);
      const hash2 = await storage.uploadBlob(content2);

      expect(hash1).not.toBe(hash2);
      expect(storage.size()).toBe(2);
    });

    it("should preserve content type", async () => {
      const content = Buffer.from('{"key": "value"}');
      const hash = await storage.uploadBlob(content, {
        contentType: "application/json",
      });

      const blobs = await storage.list();
      const metadata = blobs.find((m) => m.hash === hash);
      expect(metadata).toBeDefined();
      expect(metadata!.contentType).toBe("application/json");
    });
  });

  describe("downloadBlob", () => {
    it("should download uploaded content", async () => {
      const originalContent = Buffer.from("Download test content");
      const hash = await storage.uploadBlob(originalContent);

      const downloadedContent = await storage.downloadBlob(hash);
      expect(downloadedContent).toEqual(originalContent);
    });

    it("should throw BlobNotFoundError for non-existent hash", async () => {
      const nonExistentHash = "a".repeat(64);

      await expect(storage.downloadBlob(nonExistentHash)).rejects.toThrow(
        BlobNotFoundError,
      );
    });
  });

  describe("exists", () => {
    it("should return true for existing blob", async () => {
      const content = Buffer.from("Exists test");
      const hash = await storage.uploadBlob(content);

      expect(await storage.exists(hash)).toBe(true);
    });

    it("should return false for non-existent blob", async () => {
      const nonExistentHash = "b".repeat(64);
      expect(await storage.exists(nonExistentHash)).toBe(false);
    });
  });

  describe("delete", () => {
    it("should delete existing blob", async () => {
      const content = Buffer.from("Delete test");
      const hash = await storage.uploadBlob(content);

      expect(await storage.exists(hash)).toBe(true);
      await storage.delete(hash);
      expect(await storage.exists(hash)).toBe(false);
    });

    it("should not throw when deleting non-existent blob", async () => {
      const nonExistentHash = "c".repeat(64);
      await expect(storage.delete(nonExistentHash)).resolves.toBeUndefined();
    });
  });

  describe("list", () => {
    it("should list all blobs", async () => {
      const content1 = Buffer.from("List test 1");
      const content2 = Buffer.from("List test 2");

      const hash1 = await storage.uploadBlob(content1);
      const hash2 = await storage.uploadBlob(content2);

      const blobs = await storage.list();
      expect(blobs).toHaveLength(2);

      const hashes = blobs.map((b) => b.hash);
      expect(hashes).toContain(hash1);
      expect(hashes).toContain(hash2);
    });

    it("should filter by prefix", async () => {
      const content1 = Buffer.from("Content 1");
      const content2 = Buffer.from("Content 2");

      const hash1 = await storage.uploadBlob(content1);
      await storage.uploadBlob(content2);

      const prefix = hash1.substring(0, 10);
      const filteredBlobs = await storage.list({ prefix });

      expect(filteredBlobs).toHaveLength(1);
      expect(filteredBlobs[0]!.hash).toBe(hash1);
    });

    it("should respect limit", async () => {
      for (let i = 0; i < 5; i++) {
        await storage.uploadBlob(Buffer.from(`Content ${i}`));
      }

      const limitedBlobs = await storage.list({ limit: 3 });
      expect(limitedBlobs).toHaveLength(3);
    });

    it("should return empty array when no blobs", async () => {
      const blobs = await storage.list();
      expect(blobs).toHaveLength(0);
    });
  });

  describe("test utilities", () => {
    it("should clear all stored blobs", async () => {
      await storage.uploadBlob(Buffer.from("Test 1"));
      await storage.uploadBlob(Buffer.from("Test 2"));

      expect(storage.size()).toBe(2);

      storage.clear();
      expect(storage.size()).toBe(0);
    });

    it("should calculate total size correctly", async () => {
      const content1 = Buffer.from("A".repeat(100));
      const content2 = Buffer.from("B".repeat(200));

      await storage.uploadBlob(content1);
      await storage.uploadBlob(content2);

      expect(storage.getTotalSize()).toBe(300);
    });

    it("should return stored hashes", async () => {
      const content1 = Buffer.from("Hash test 1");
      const content2 = Buffer.from("Hash test 2");

      const hash1 = await storage.uploadBlob(content1);
      const hash2 = await storage.uploadBlob(content2);

      const hashes = storage.getStoredHashes();
      expect(hashes).toContain(hash1);
      expect(hashes).toContain(hash2);
      expect(hashes).toHaveLength(2);
    });
  });
});
