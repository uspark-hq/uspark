import { getBlobStorage, type BlobStorageProvider } from "@uspark/core";
import { env } from "../../env";

/**
 * Get the blob storage instance for the web app
 * Uses environment variables to determine the storage provider
 */
export function getBlobStorageInstance(): BlobStorageProvider {
  return getBlobStorage({
    type: env().BLOB_READ_WRITE_TOKEN ? "vercel" : "memory",
  });
}
