import { put, head, del, list } from "@vercel/blob";
import type {
  BlobStorageProvider,
  BlobMetadata,
  UploadOptions,
  ListOptions,
} from "@uspark/core";
import {
  BlobNotFoundError,
  generateContentHash,
  detectContentType,
} from "@uspark/core";

export class VercelBlobStorage implements BlobStorageProvider {
  async uploadBlob(
    content: Buffer,
    options: UploadOptions = {},
  ): Promise<string> {
    const hash = generateContentHash(content);

    // Check if blob already exists (deduplication)
    if (await this.exists(hash)) {
      return hash;
    }

    const contentType = options.contentType ?? detectContentType(content);

    await put(hash, content, {
      access: "public",
      contentType,
      addRandomSuffix: options.addRandomSuffix ?? false,
    });

    return hash;
  }

  async downloadBlob(hash: string): Promise<Buffer> {
    const url = this.getBlobUrl(hash);
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        throw new BlobNotFoundError(hash);
      }
      throw new Error(`Failed to download blob: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async exists(hash: string): Promise<boolean> {
    try {
      const url = this.getBlobUrl(hash);
      await head(url);
      return true;
    } catch {
      return false;
    }
  }

  async delete(hash: string): Promise<void> {
    const url = this.getBlobUrl(hash);
    await del([url]);
  }

  async list(options: ListOptions = {}): Promise<BlobMetadata[]> {
    const result = await list({
      prefix: options.prefix,
      limit: options.limit,
      cursor: options.cursor,
    });

    return result.blobs.map((blob) => ({
      hash: this.extractHashFromUrl(blob.url),
      size: blob.size,
      contentType: "application/octet-stream", // Default content type
      uploadedAt: blob.uploadedAt,
      url: blob.url,
    }));
  }

  private getBlobUrl(hash: string): string {
    // Construct Vercel Blob URL from hash
    // Token format: vercel_blob_rw_[STORE_ID]_[SECRET]
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      throw new Error("BLOB_READ_WRITE_TOKEN environment variable is required");
    }

    const parts = token.split("_");
    if (parts.length < 4 || !parts[3]) {
      throw new Error("Invalid BLOB_READ_WRITE_TOKEN format");
    }

    const storeId = parts[3]; // The store ID is the 4th part
    return `https://${storeId}.public.blob.vercel-storage.com/${hash}`;
  }

  private extractHashFromUrl(url: string): string {
    // Extract hash from Vercel Blob URL
    const parts = url.split("/");
    return parts[parts.length - 1] || "";
  }
}
