import {
  describe,
  it,
  expect,
  beforeEach,
  vi,
  type MockedFunction,
} from "vitest";
import { VercelBlobStorage } from "../vercel-blob-storage";
import { BlobNotFoundError, BlobUploadError } from "../types";

// Mock @vercel/blob
vi.mock("@vercel/blob", () => {
  return {
    put: vi.fn(),
    head: vi.fn(),
    del: vi.fn(),
    list: vi.fn(),
  };
});

// Import mocked functions with proper typing
import { put, head, del, list } from "@vercel/blob";

const mockPut = put as MockedFunction<typeof put>;
const mockHead = head as MockedFunction<typeof head>;
const mockDel = del as MockedFunction<typeof del>;
const mockList = list as MockedFunction<typeof list>;

describe("VercelBlobStorage", () => {
  let storage: VercelBlobStorage;

  beforeEach(() => {
    storage = new VercelBlobStorage();
    vi.clearAllMocks();

    // Mock environment variable
    process.env.BLOB_READ_WRITE_TOKEN = "test-token_rest-of-token";

    // Setup default mock implementations
    mockPut.mockImplementation(async (key: string) => ({
      url: `https://test-blob.vercel-storage.com/${key}`,
      downloadUrl: `https://test-blob.vercel-storage.com/${key}`,
      pathname: key,
      contentType: "application/octet-stream",
      contentDisposition: `attachment; filename="${key}"`,
    }));

    // No upload mock needed - using put with multipart: true

    mockHead.mockImplementation(async (url: string) => ({
      url,
      downloadUrl: url,
      size: 100,
      uploadedAt: new Date(),
      pathname: url.split("/").pop() || "unknown",
      contentType: "application/octet-stream",
      contentDisposition: "attachment",
      cacheControl: "public, max-age=31536000",
    }));

    mockDel.mockResolvedValue(undefined);

    mockList.mockImplementation(async () => ({
      blobs: [
        {
          url: "https://test-blob.vercel-storage.com/test1",
          downloadUrl: "https://test-blob.vercel-storage.com/test1",
          pathname: "test1",
          size: 100,
          uploadedAt: new Date(),
        },
        {
          url: "https://test-blob.vercel-storage.com/test2",
          downloadUrl: "https://test-blob.vercel-storage.com/test2",
          pathname: "test2",
          size: 200,
          uploadedAt: new Date(),
        },
      ],
      cursor: undefined,
      hasMore: false,
    }));
  });

  describe("uploadBlob", () => {
    it("should upload small files using put", async () => {
      const content = Buffer.from("Small file content");

      // Mock exists to return false (blob doesn't exist)
      mockHead.mockRejectedValueOnce(new Error("Not found"));

      const hash = await storage.uploadBlob(content);

      expect(mockPut).toHaveBeenCalledWith(
        hash,
        content,
        expect.objectContaining({
          access: "public",
          contentType: "text/plain",
          addRandomSuffix: false,
        }),
      );
      // Large files also use put() with multipart: true
    });

    it("should deduplicate identical content", async () => {
      const content = Buffer.from("Duplicate content");

      // Mock exists to return false first time, true second time
      let callCount = 0;
      mockHead.mockImplementation(async (url: string) => {
        callCount++;
        if (callCount === 1) {
          throw new Error("Not found");
        }
        return {
          url,
          downloadUrl: url,
          size: 100,
          uploadedAt: new Date(),
          pathname: url.split("/").pop() || "unknown",
          contentType: "application/octet-stream",
          contentDisposition: "attachment",
          cacheControl: "public, max-age=31536000",
        };
      });

      // First upload
      const hash1 = await storage.uploadBlob(content);
      expect(mockPut).toHaveBeenCalledTimes(1);

      // Second upload of same content should skip upload
      const hash2 = await storage.uploadBlob(content);
      expect(hash1).toBe(hash2);
      expect(mockPut).toHaveBeenCalledTimes(1); // Still only called once
    });

    it("should respect custom content type", async () => {
      const content = Buffer.from('{"json": true}');

      // Mock exists to return false (blob doesn't exist)
      mockHead.mockRejectedValueOnce(new Error("Not found"));

      await storage.uploadBlob(content, { contentType: "application/json" });

      expect(mockPut).toHaveBeenCalledWith(
        expect.any(String),
        content,
        expect.objectContaining({
          contentType: "application/json",
        }),
      );
    });

    it("should handle upload errors", async () => {
      const content = Buffer.from("Error test content");

      // Mock exists to return false (blob doesn't exist)
      mockHead.mockRejectedValue(new Error("Not found"));

      // Mock put to fail
      mockPut.mockRejectedValueOnce(new Error("Network error"));

      await expect(storage.uploadBlob(content)).rejects.toThrow(
        BlobUploadError,
      );
    });
  });

  describe("downloadBlob", () => {
    it("should throw BlobNotFoundError for 404 responses", async () => {
      const nonExistentHash = "a".repeat(64);

      // Mock 404 response
      const mockResponse = { ok: false, status: 404 };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await expect(storage.downloadBlob(nonExistentHash)).rejects.toThrow(
        BlobNotFoundError,
      );
    });

    it("should throw error for other HTTP errors", async () => {
      const hash = "b".repeat(64);

      // Mock 500 response
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await expect(storage.downloadBlob(hash)).rejects.toThrow(
        "Failed to download blob: Internal Server Error",
      );
    });
  });

  describe("exists", () => {
    it("should return true for existing blob", async () => {
      const hash = "a".repeat(64);

      // Mock head to succeed
      mockHead.mockResolvedValueOnce({
        url: `https://test-blob.vercel-storage.com/${hash}`,
        downloadUrl: `https://test-blob.vercel-storage.com/${hash}`,
        pathname: hash,
        size: 100,
        uploadedAt: new Date(),
        contentType: "application/octet-stream",
        contentDisposition: "attachment",
        cacheControl: "public, max-age=31536000",
      });

      const exists = await storage.exists(hash);
      expect(exists).toBe(true);
      expect(mockHead).toHaveBeenCalled();
    });

    it("should return false for non-existent blob", async () => {
      const nonExistentHash = "c".repeat(64);

      // Mock head to fail
      mockHead.mockRejectedValueOnce(new Error("Not found"));

      const exists = await storage.exists(nonExistentHash);
      expect(exists).toBe(false);
    });
  });

  describe("delete", () => {
    it("should delete existing blob", async () => {
      const hash = "d".repeat(64);

      await storage.delete(hash);
      expect(mockDel).toHaveBeenCalledWith([expect.stringContaining(hash)]);
    });

    it("should handle deletion errors", async () => {
      const hash = "d".repeat(64);

      mockDel.mockRejectedValueOnce(new Error("Delete failed"));

      await expect(storage.delete(hash)).rejects.toThrow(
        "Failed to delete blob",
      );
    });
  });

  describe("list", () => {
    it("should list all blobs", async () => {
      const blobs = await storage.list();
      expect(mockList).toHaveBeenCalled();
      expect(blobs).toHaveLength(2);
      expect(blobs[0]).toHaveProperty("hash");
      expect(blobs[0]).toHaveProperty("size");
      expect(blobs[0]).toHaveProperty("contentType");
      expect(blobs[0]).toHaveProperty("uploadedAt");
    });

    it("should pass options to list function", async () => {
      const options = { prefix: "test-", limit: 10 };

      await storage.list(options);
      expect(mockList).toHaveBeenCalledWith(options);
    });

    it("should handle list errors", async () => {
      mockList.mockRejectedValueOnce(new Error("List failed"));

      await expect(storage.list()).rejects.toThrow("Failed to list blobs");
    });
  });
});
