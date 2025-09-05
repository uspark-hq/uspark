import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createBlobStorage,
  getBlobStorage,
  resetBlobStorage,
  type BlobStorageType,
} from "../factory";
import { VercelBlobStorage } from "../vercel-blob-storage";
import { MemoryBlobStorage } from "../memory-blob-storage";

describe("Blob Storage Factory", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    resetBlobStorage();
    // Reset environment
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("createBlobStorage", () => {
    it("should create VercelBlobStorage when type is vercel and token exists", () => {
      process.env.BLOB_READ_WRITE_TOKEN = "test-token";
      const storage = createBlobStorage({ type: "vercel" });
      expect(storage).toBeInstanceOf(VercelBlobStorage);
    });

    it("should throw error when type is vercel but token missing", () => {
      delete process.env.BLOB_READ_WRITE_TOKEN;
      expect(() => createBlobStorage({ type: "vercel" })).toThrow(
        "BLOB_READ_WRITE_TOKEN environment variable is required for Vercel Blob storage"
      );
    });

    it("should create MemoryBlobStorage when type is memory", () => {
      const storage = createBlobStorage({ type: "memory" });
      expect(storage).toBeInstanceOf(MemoryBlobStorage);
    });

    it("should throw error for unsupported type", () => {
      expect(() =>
        createBlobStorage({ type: "unsupported" as BlobStorageType }),
      ).toThrow("Unsupported blob storage type: unsupported");
    });
  });

  describe("auto-detection without config", () => {
    it("should use VercelBlobStorage when token is available", () => {
      process.env.BLOB_READ_WRITE_TOKEN = "test-token";

      const storage = createBlobStorage();
      expect(storage).toBeInstanceOf(VercelBlobStorage);
    });

    it("should throw error when no token is available", () => {
      delete process.env.BLOB_READ_WRITE_TOKEN;

      expect(() => createBlobStorage()).toThrow(
        "BLOB_READ_WRITE_TOKEN environment variable is required. Run 'vercel pull' to get the token."
      );
    });
  });

  describe("getBlobStorage singleton", () => {
    it("should return same instance on multiple calls", () => {
      const storage1 = getBlobStorage({ type: "memory" });
      const storage2 = getBlobStorage({ type: "memory" }); // Config ignored on second call

      expect(storage1).toBe(storage2);
      expect(storage1).toBeInstanceOf(MemoryBlobStorage);
    });

    it("should create new instance after reset", () => {
      const storage1 = getBlobStorage({ type: "memory" });
      resetBlobStorage();
      process.env.BLOB_READ_WRITE_TOKEN = "test-token";
      const storage2 = getBlobStorage({ type: "vercel" });

      expect(storage1).not.toBe(storage2);
      expect(storage1).toBeInstanceOf(MemoryBlobStorage);
      expect(storage2).toBeInstanceOf(VercelBlobStorage);
    });
  });
});
