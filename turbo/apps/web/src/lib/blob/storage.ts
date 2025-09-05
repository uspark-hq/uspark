import { getBlobStorage, type BlobStorageProvider } from "@uspark/core";

/**
 * Get the blob storage instance for the web app
 * Always uses Vercel Blob storage (required for MVP)
 */
export function getBlobStorageInstance(): BlobStorageProvider {
  // Vercel Blob is required - env validation ensures token exists
  return getBlobStorage({
    type: "vercel",
  });
}
