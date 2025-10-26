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
  private unackedDiff: Uint8Array | null;

  constructor(config: DocStoreConfig) {
    this.doc = new Y.Doc();
    this.version = 0;
    this.projectId = config.projectId;
    this.token = config.token;
    this.baseUrl = config.baseUrl || "";
    this.lastSyncStateVector = null;
    this.unackedDiff = null;
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
   * Flow:
   * 1. If not first sync, check for server updates via GET /diff
   * 2. If server has updates (200), apply them locally
   * 3. If there are local changes, PATCH them to server
   * 4. If PATCH returns 409, handle conflict and return
   */
  async sync(signal: AbortSignal): Promise<void> {
    const url = `${this.baseUrl}/api/projects/${this.projectId}`;

    // Step 1: Calculate and save unacked diff before checking server updates
    if (this.lastSyncStateVector) {
      const localDiff = Y.encodeStateAsUpdate(
        this.doc,
        this.lastSyncStateVector,
      );
      if (localDiff.length > 0) {
        this.unackedDiff = new Uint8Array(localDiff);
      }
    }

    // Step 2: If not first sync, proactively check for server updates
    if (this.lastSyncStateVector) {
      const diffResponse = await fetch(
        `${url}/diff?fromVersion=${this.version}`,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
          signal,
        },
      );

      if (diffResponse.status === 200) {
        // Server has updates, parse encoded response: [length][stateVector][diff]
        const responseBuffer = await diffResponse.arrayBuffer();
        const responseArray = new Uint8Array(responseBuffer);

        // Read state vector length (first 4 bytes, big-endian uint32)
        const view = new DataView(responseBuffer);
        const stateVectorLength = view.getUint32(0, false);

        // Extract state vector
        const serverStateVector = responseArray.slice(4, 4 + stateVectorLength);

        // Extract diff
        const serverDiff = responseArray.slice(4 + stateVectorLength);

        const currentVersion = parseInt(
          diffResponse.headers.get("X-Version") || "0",
        );

        // Apply server updates to doc
        Y.applyUpdate(this.doc, serverDiff);
        this.version = currentVersion;

        // Use server's state vector
        this.lastSyncStateVector = serverStateVector;

        // Re-apply local changes (YJS is idempotent, won't duplicate)
        if (this.unackedDiff) {
          Y.applyUpdate(this.doc, this.unackedDiff);
        }

        // Recalculate unackedDiff based on server state
        this.unackedDiff = Y.encodeStateAsUpdate(
          this.doc,
          this.lastSyncStateVector,
        );

        // Return after merging server updates
        // Next sync() call will push the merged changes
        return;
      }
      // If 304, server has no updates, continue to push local changes
    }

    // Step 3: Check if we have local changes to push
    if (
      this.lastSyncStateVector &&
      this.unackedDiff &&
      this.unackedDiff.length > 0
    ) {
      // We have local changes, PATCH them to server
      const body = new Uint8Array(this.unackedDiff);

      const patchResponse = await fetch(url, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/octet-stream",
          "If-Match": this.version.toString(),
        },
        body,
        signal,
      });

      if (patchResponse.status === 409) {
        // Conflict detected, handle it and return
        await this.handleConflict(patchResponse);
        return;
      }

      if (!patchResponse.ok) {
        throw new Error(
          `PATCH failed: ${patchResponse.status} ${patchResponse.statusText}`,
        );
      }

      // PATCH successful, apply response
      await this.applyServerResponse(patchResponse);
      return;
    }

    // No local changes or already synced
    if (this.lastSyncStateVector) {
      return;
    }

    // Step 4: First sync, GET full state
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      signal,
    });

    if (!response.ok) {
      throw new Error(
        `Failed to sync: ${response.status} ${response.statusText}`,
      );
    }

    await this.applyServerResponse(response);
  }

  /**
   * Handle 409 conflict response
   * Applies server updates, merges with local changes, and returns
   */
  private async handleConflict(conflictResponse: Response): Promise<void> {
    // Parse 409 response: [length][stateVector][diff]
    const responseBuffer = await conflictResponse.arrayBuffer();
    const responseArray = new Uint8Array(responseBuffer);

    // Read state vector length (first 4 bytes, big-endian uint32)
    const view = new DataView(responseBuffer);
    const stateVectorLength = view.getUint32(0, false);

    // Extract state vector
    const serverStateVector = responseArray.slice(4, 4 + stateVectorLength);

    // Extract diff
    const serverDiff = responseArray.slice(4 + stateVectorLength);

    const currentVersion = parseInt(
      conflictResponse.headers.get("X-Version") || "0",
    );

    // Apply server updates
    Y.applyUpdate(this.doc, serverDiff);
    this.version = currentVersion;

    // Use server's state vector
    this.lastSyncStateVector = serverStateVector;

    // Re-apply local changes (YJS is idempotent)
    if (this.unackedDiff) {
      Y.applyUpdate(this.doc, this.unackedDiff);
    }

    // Recalculate unackedDiff for next sync
    this.unackedDiff = Y.encodeStateAsUpdate(
      this.doc,
      this.lastSyncStateVector,
    );

    // Don't retry PATCH, just return
    // Next sync() call will push the remaining local changes
  }

  /**
   * Apply server response (common logic)
   */
  private async applyServerResponse(response: Response): Promise<void> {
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

    // Clear unacknowledged diff after successful sync
    this.unackedDiff = null;
  }
}
