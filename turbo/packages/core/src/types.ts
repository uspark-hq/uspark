export interface FileNode {
  hash: string;
  mtime: number;
}

export interface BlobInfo {
  size: number;
}

export interface BlobStore {
  get(hash: string): string | undefined;
  set(hash: string, content: string): void;
}