import { put, head, del, list } from "@vercel/blob";
import type {
  BlobStorageProvider,
  BlobMetadata,
  UploadOptions,
  ListOptions,
} from "./types";
import { BlobNotFoundError, BlobUploadError } from "./types";
import { generateContentHash, detectContentType } from "./utils";

export class VercelBlobStorage implements BlobStorageProvider {
  async uploadBlob(
    content: Buffer,
    options: UploadOptions = {},
  ): Promise<string> {
    const hash = generateContentHash(content);

    try {
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
    } catch (error) {
      throw new BlobUploadError(
        `Failed to upload blob with hash ${hash}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async downloadBlob(hash: string): Promise<Buffer> {
    try {
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
    } catch (error) {
      if (error instanceof BlobNotFoundError) {
        throw error;
      }
      throw new Error(`Failed to download blob with hash ${hash}: ${error}`);
    }
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
    try {
      const url = this.getBlobUrl(hash);
      await del([url]);
    } catch (error) {
      throw new Error(`Failed to delete blob with hash ${hash}: ${error}`);
    }
  }

  async list(options: ListOptions = {}): Promise<BlobMetadata[]> {
    try {
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
    } catch (error) {
      throw new Error(`Failed to list blobs: ${error}`);
    }
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
