import { put, head, del, list } from "@vercel/blob";
import type {
  BlobStorageProvider,
  BlobMetadata,
  UploadOptions,
  ListOptions,
} from "./types";
import { BlobNotFoundError } from "./types";
import { generateContentHash, detectContentType } from "./utils";

export class VercelBlobStorage implements BlobStorageProvider {
  private readonly MULTIPART_THRESHOLD = 4.5 * 1024 * 1024; // 4.5MB

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

    if (content.length > this.MULTIPART_THRESHOLD) {
      // Use multipart upload for large files
      await put(hash, content, {
        access: "public",
        multipart: true,
        contentType,
      });
    } else {
      // Use standard upload for small files
      await put(hash, content, {
        access: "public",
        contentType,
        addRandomSuffix: options.addRandomSuffix ?? false,
      });
    }

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
    const baseUrl = process.env.BLOB_READ_WRITE_TOKEN?.split("_")[0];
    if (!baseUrl) {
      throw new Error("BLOB_READ_WRITE_TOKEN environment variable is required");
    }
    return `https://${baseUrl}.public.blob.vercel-storage.com/${hash}`;
  }

  private extractHashFromUrl(url: string): string {
    // Extract hash from Vercel Blob URL
    const parts = url.split("/");
    return parts[parts.length - 1] || "";
  }
}
