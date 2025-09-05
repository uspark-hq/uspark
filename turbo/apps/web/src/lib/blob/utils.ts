/**
 * Utility functions for Vercel Blob Storage
 */

/**
 * Extract the Store ID from a Vercel Blob token
 * Token format: vercel_blob_rw_[STORE_ID]_[SECRET]
 */
export function getStoreIdFromToken(token: string): string {
  const parts = token.split("_");
  if (parts.length < 4 || !parts[3]) {
    throw new Error("Invalid BLOB_READ_WRITE_TOKEN format");
  }
  return parts[3];
}

/**
 * Construct a public Blob URL from a project ID and hash
 * This URL can be accessed without authentication
 */
export function getPublicBlobUrl(projectId: string, hash: string, token: string): string {
  const storeId = getStoreIdFromToken(token);
  return `https://${storeId}.public.blob.vercel-storage.com/projects/${projectId}/${hash}`;
}
