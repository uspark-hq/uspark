import type { BlobStorageProvider } from "./types";
import { VercelBlobStorage } from "./vercel-blob-storage";
import { MemoryBlobStorage } from "./memory-blob-storage";

export type BlobStorageType = "vercel" | "memory";

export interface BlobStorageConfig {
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
          throw new Error("BLOB_READ_WRITE_TOKEN environment variable is required for Vercel Blob storage");
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
    throw new Error("BLOB_READ_WRITE_TOKEN environment variable is required. Run 'vercel dev' for local development.");
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
