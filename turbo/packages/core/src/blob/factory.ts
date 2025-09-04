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
        return new VercelBlobStorage();

      case "memory":
        return new MemoryBlobStorage();

      default:
        throw new Error(`Unsupported blob storage type: ${config.type}`);
    }
  }

  // Auto-detect based on available configuration
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return new VercelBlobStorage();
  }

  // Default to memory storage if no Vercel token available
  // This allows development without Vercel configuration
  return new MemoryBlobStorage();
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
