import type { BlobStorageProvider } from "@uspark/core";
import { VercelBlobStorage } from "./vercel-blob-storage";
import { MemoryBlobStorage } from "./memory-blob-storage";

export type BlobStorageType = "vercel" | "memory";

interface BlobStorageConfig {
  type: BlobStorageType;
  vercelToken?: string;
}

export function createBlobStorage(
  config?: BlobStorageConfig,
): BlobStorageProvider {
  // Use explicit config if provided
  if (config) {
    switch (config.type) {
      case "vercel":
        if (!process.env.BLOB_READ_WRITE_TOKEN) {
          throw new Error(
            "BLOB_READ_WRITE_TOKEN environment variable is required",
          );
        }
        return new VercelBlobStorage();

      case "memory":
        return new MemoryBlobStorage();

      default:
        throw new Error(`Unsupported blob storage type: ${config.type}`);
    }
  }

  // Vercel Blob is required - no fallback
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN environment variable is required");
  }

  return new VercelBlobStorage();
}

// Singleton instance
let _blobStorage: BlobStorageProvider | undefined;

export function getBlobStorage(
  config?: BlobStorageConfig,
): BlobStorageProvider {
  if (!_blobStorage) {
    _blobStorage = createBlobStorage(config);
  }
  return _blobStorage;
}

export function resetBlobStorage(): void {
  _blobStorage = undefined;
}
