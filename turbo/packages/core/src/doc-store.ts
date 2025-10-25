import * as Y from "yjs";

export interface DocStoreConfig {
  projectId: string;
  token: string;
  baseUrl?: string;
}

export interface FileNode {
  hash: string;
  mtime: number;
}

export interface BlobInfo {
  size: number;
}

/**
 * DocStore manages a YJS document and version number for project synchronization
 */
export class DocStore {
  private doc: Y.Doc;
  private version: number;
  private projectId: string;
  private token: string;
  private baseUrl: string;
  private lastSyncStateVector: Uint8Array | null;

  constructor(config: DocStoreConfig) {
    this.doc = new Y.Doc();
    this.version = 0;
    this.projectId = config.projectId;
    this.token = config.token;
    this.baseUrl = config.baseUrl || "";
    this.lastSyncStateVector = null;
  }

  /**
   * Get the current version number
   */
  getVersion(): number {
    return this.version;
  }

  /**
   * Set a file in the document
   * Updates both files and blobs maps
   */
  setFile(path: string, hash: string, size: number): void {
    const filesMap = this.doc.getMap<FileNode>("files");
    filesMap.set(path, { hash, mtime: Date.now() });

    const blobsMap = this.doc.getMap<BlobInfo>("blobs");
    if (!blobsMap.has(hash)) {
      blobsMap.set(hash, { size });
    }
  }

  /**
   * Get a file from the document
   * Returns undefined if file doesn't exist
   */
  getFile(path: string): FileNode | undefined {
    const filesMap = this.doc.getMap<FileNode>("files");
    return filesMap.get(path);
  }

  /**
   * Delete a file from the document
   * Note: Does not delete from blobs map as other files may reference the same hash
   */
  deleteFile(path: string): void {
    const filesMap = this.doc.getMap<FileNode>("files");
    filesMap.delete(path);
  }

  /**
   * Get all files from the document
   */
  getAllFiles(): Map<string, FileNode> {
    const filesMap = this.doc.getMap<FileNode>("files");
    const result = new Map<string, FileNode>();
    filesMap.forEach((node, path) => {
      if (typeof path === "string") {
        result.set(path, node);
      }
    });
    return result;
  }

  /**
   * Sync with the server (pull + push)
   * If there are local changes, pushes them to server using PATCH
   * Otherwise, pulls latest state from server using GET
   */
  async sync(signal: AbortSignal): Promise<void> {
    const url = `${this.baseUrl}/api/projects/${this.projectId}`;

    let response: Response;

    // Check if we have local changes
    if (this.lastSyncStateVector) {
      // Calculate diff from last sync
      const diff = Y.encodeStateAsUpdate(this.doc, this.lastSyncStateVector);

      // If diff is not empty, we have local changes
      if (diff.length > 0) {
        // PATCH: Push local changes to server
        // Create a new Uint8Array to ensure we have an ArrayBuffer (not SharedArrayBuffer)
        const body = new Uint8Array(diff);
        response = await fetch(url, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/octet-stream",
            "If-Match": this.version.toString(),
          },
          body,
          signal,
        });
      } else {
        // No local changes, do GET
        response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
          signal,
        });
      }
    } else {
      // First sync, do GET
      response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
        signal,
      });
    }

    if (!response.ok) {
      throw new Error(
        `Failed to sync: ${response.status} ${response.statusText}`,
      );
    }

    // Read version from response header
    const versionHeader = response.headers.get("X-Version");
    if (versionHeader) {
      this.version = parseInt(versionHeader, 10);
    }

    // Apply YJS update from server
    const buffer = await response.arrayBuffer();
    const update = new Uint8Array(buffer);
    Y.applyUpdate(this.doc, update);

    // Save current state vector after successful sync
    this.lastSyncStateVector = Y.encodeStateVector(this.doc);
  }
}
