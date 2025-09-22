import type { YjsBlobConfig } from "./types";

/**
 * Extracts blob storage URL prefix from a Vercel blob token
 * @param token The Vercel blob read/write token
 * @returns The blob storage URL prefix
 */
export function getBlobUrlPrefix(token: string): string {
  // Token format: vercel_blob_rw_[STORE_ID]_[SECRET]
  const parts = token.split("_");
  if (parts.length < 4 || !parts[3]) {
    throw new Error("Invalid BLOB_READ_WRITE_TOKEN format");
  }

  const storeId = parts[3]; // The store ID is the 4th part
  return `https://${storeId}.public.blob.vercel-storage.com`;
}

/**
 * Constructs the full blob URL from hash and prefix
 * @param hash The file hash
 * @param urlPrefix The blob storage URL prefix
 * @returns The full URL to the blob
 */
export function getBlobUrl(hash: string, urlPrefix: string): string {
  return `${urlPrefix}/${hash}`;
}

/**
 * Downloads file content from blob storage
 * @param hash The file hash
 * @param config Blob storage configuration
 * @returns The file content as string
 */
export async function downloadFileContent(
  hash: string,
  config: YjsBlobConfig,
): Promise<string> {
  const url = getBlobUrl(hash, config.urlPrefix);

  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`File not found in blob storage: ${hash}`);
    }
    throw new Error(`Failed to download file: ${response.statusText}`);
  }

  return response.text();
}

/**
 * Downloads file content as buffer from blob storage
 * @param hash The file hash
 * @param config Blob storage configuration
 * @returns The file content as ArrayBuffer
 */
export async function downloadFileBuffer(
  hash: string,
  config: YjsBlobConfig,
): Promise<ArrayBuffer> {
  const url = getBlobUrl(hash, config.urlPrefix);

  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`File not found in blob storage: ${hash}`);
    }
    throw new Error(`Failed to download file: ${response.statusText}`);
  }

  return response.arrayBuffer();
}
