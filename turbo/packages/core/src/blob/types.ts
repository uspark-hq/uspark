export interface BlobMetadata {
  hash: string;
  size: number;
  contentType: string;
  uploadedAt: Date;
  url?: string;
}

export interface UploadOptions {
  contentType?: string;
  access?: "public" | "private";
  addRandomSuffix?: boolean;
}

export interface ListOptions {
  prefix?: string;
  limit?: number;
  cursor?: string;
}

export interface BlobStorageProvider {
  uploadBlob(content: Buffer, options?: UploadOptions): Promise<string>;
  downloadBlob(hash: string): Promise<Buffer>;
  exists(hash: string): Promise<boolean>;
  delete(hash: string): Promise<void>;
  list(options?: ListOptions): Promise<BlobMetadata[]>;
}

export class BlobNotFoundError extends Error {
  constructor(hash: string) {
    super(`Blob not found: ${hash}`);
    this.name = "BlobNotFoundError";
  }
}

export class BlobUploadError extends Error {
  constructor(
    message: string,
    public cause?: Error,
  ) {
    super(message);
    this.name = "BlobUploadError";
  }
}
