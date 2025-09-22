export interface YjsFileNode {
  hash: string;
  mtime: number;
}

export interface YjsBlobInfo {
  size: number;
  content?: string; // Optional: content may be stored directly in YJS
}

export interface FileItem {
  path: string;
  type: "file" | "directory";
  size?: number;
  mtime?: number;
  hash?: string;
  children?: FileItem[];
}

export interface YjsFileSystem {
  files: FileItem[];
  totalSize: number;
  fileCount: number;
}

export interface YjsBlobConfig {
  /**
   * The blob storage URL prefix, e.g., "https://[storeId].public.blob.vercel-storage.com"
   */
  urlPrefix: string;
}
