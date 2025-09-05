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
  private readonly MULTIPART_THRESHOLD = 4.5 * 1024 * 1024; // 4.5MB

  async uploadBlob(
    content: Buffer,
    options: UploadOptions = {},
  ): Promise<string> {
    const hash = generateContentHash(content);

    try {
      const contentType = options.contentType ?? detectContentType(content);

      let result;
      if (content.length > this.MULTIPART_THRESHOLD) {
        // Use multipart upload for large files
        result = await put(hash, content, {
          access: "public",
          multipart: true,
          contentType,
        });
      } else {
        // Use standard upload for small files
        result = await put(hash, content, {
          access: "public",
          contentType,
          addRandomSuffix: options.addRandomSuffix ?? false,
        });
      }

      // Return the pathname which is the actual blob identifier
      return result.pathname;
    } catch (error) {
      throw new BlobUploadError(
        `Failed to upload blob with hash ${hash}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  async downloadBlob(blobId: string): Promise<Buffer> {
    try {
      const url = this.getBlobUrl(blobId);
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 404) {
          throw new BlobNotFoundError(blobId);
        }
        throw new Error(`Failed to download blob: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      if (error instanceof BlobNotFoundError) {
        throw error;
      }
      // Re-throw the original error if it's already an Error with the expected format
      if (
        error instanceof Error &&
        error.message.startsWith("Failed to download blob:")
      ) {
        throw error;
      }
      throw new Error(`Failed to download blob with id ${blobId}: ${error}`);
    }
  }

  async exists(blobId: string): Promise<boolean> {
    try {
      const url = this.getBlobUrl(blobId);
      await head(url);
      return true;
    } catch {
      return false;
    }
  }

  async delete(blobId: string): Promise<void> {
    try {
      const url = this.getBlobUrl(blobId);
      await del([url]);
    } catch (error) {
      throw new Error(`Failed to delete blob with id ${blobId}: ${error}`);
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

  private getBlobUrl(blobId: string): string {
    // Construct Vercel Blob URL from blob ID (pathname)
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      throw new Error("BLOB_READ_WRITE_TOKEN environment variable is required");
    }

    // Extract base URL from token format: vercel_blob_rw_<id>_<suffix>
    const parts = token.split("_");
    if (parts.length < 4) {
      throw new Error("Invalid BLOB_READ_WRITE_TOKEN format");
    }
    const baseId = parts[3]; // Get the ID part
    return `https://${baseId}.public.blob.vercel-storage.com/${blobId}`;
  }

  private extractHashFromUrl(url: string): string {
    // Extract hash from Vercel Blob URL
    const parts = url.split("/");
    return parts[parts.length - 1] || "";
  }
}
