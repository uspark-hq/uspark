import { vi } from "vitest";
import { generateContentHash } from "../utils.js";
import type {
  PutBlobResult,
  HeadBlobResult,
  ListBlobResult,
} from "@vercel/blob";

// Mock blob store
const mockBlobStore = new Map<
  string,
  {
    content: Buffer;
    contentType: string;
    size: number;
    uploadedAt: Date;
    url: string;
  }
>();

// Mock functions
export const put = vi.fn(
  async (
    key: string,
    content: Buffer | string,
    options: Record<string, unknown> = {},
  ): Promise<PutBlobResult> => {
    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
    const hash = options.addRandomSuffix
      ? `${generateContentHash(buffer)}-${key}`
      : key;

    const contentType =
      (options.contentType as string) || "application/octet-stream";
    const entry = {
      content: buffer,
      contentType,
      size: buffer.length,
      uploadedAt: new Date(),
      url: `https://test-blob.vercel-storage.com/${hash}`,
    };

    mockBlobStore.set(hash, entry);

    return {
      url: entry.url,
      downloadUrl: entry.url,
      pathname: hash,
      contentType: contentType,
      contentDisposition: `attachment; filename="${key}"`,
    };
  },
);

export const upload = vi.fn(
  async (
    key: string,
    content: Buffer | string,
    options: Record<string, unknown> = {},
  ): Promise<PutBlobResult> => {
    // For multipart uploads, delegate to put
    return put(key, content, { ...options, multipart: true });
  },
);

export const head = vi.fn(async (url: string): Promise<HeadBlobResult> => {
  const key = url.split("/").pop();
  if (!key || !mockBlobStore.has(key)) {
    throw new Error("Blob not found");
  }

  const entry = mockBlobStore.get(key)!;
  return {
    url,
    downloadUrl: url,
    size: entry.size,
    uploadedAt: entry.uploadedAt,
    pathname: key,
    contentType: entry.contentType,
    contentDisposition: `attachment; filename="${key}"`,
    cacheControl: "public, max-age=31536000",
  };
});

export const del = vi.fn(async (urls: string[]): Promise<void> => {
  urls.forEach((url) => {
    const key = url.split("/").pop();
    if (key) {
      mockBlobStore.delete(key);
    }
  });
});

export const list = vi.fn(
  async (options: Record<string, unknown> = {}): Promise<ListBlobResult> => {
    let blobs = Array.from(mockBlobStore.entries()).map(([key, entry]) => ({
      url: entry.url,
      pathname: key,
      size: entry.size,
      uploadedAt: entry.uploadedAt,
      contentType: entry.contentType,
      contentDisposition: `attachment; filename="${key}"`,
    }));

    // Apply filters
    if (options.prefix && typeof options.prefix === "string") {
      blobs = blobs.filter((blob) =>
        blob.pathname.startsWith(options.prefix as string),
      );
    }

    if (options.limit && typeof options.limit === "number") {
      blobs = blobs.slice(0, options.limit as number);
    }

    return {
      blobs: blobs.map((blob) => ({
        ...blob,
        downloadUrl: blob.url,
      })),
      cursor: undefined,
      hasMore: false,
    };
  },
);

// Test utilities
export const __getMockStore = () => mockBlobStore;
export const __clearMockStore = () => mockBlobStore.clear();
export const __getMockStoreSize = () => mockBlobStore.size;
export const __getBlobContent = (key: string) =>
  mockBlobStore.get(key)?.content;
