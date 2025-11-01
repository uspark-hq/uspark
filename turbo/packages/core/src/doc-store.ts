import * as Y from "yjs";

// Binary protocol constants
const STATE_VECTOR_LENGTH_BYTES = 4;
const BIG_ENDIAN = false;

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
   * Dump the entire DocStore state as a binary snapshot
   * Can be used for persistence or transfer
   * @returns Binary YJS state
   */
  dump(): Uint8Array {
    return Y.encodeStateAsUpdate(this.doc);
  }

  /**
   * Load a previously dumped state into the DocStore
   * Merges the state with current document using YJS CRDT rules
   * @param snapshot Binary YJS state from dump()
   */
  load(snapshot: Uint8Array): void {
    Y.applyUpdate(this.doc, snapshot);
  }

  private async cloneDoc(signal: AbortSignal) {
    const url = `${this.baseUrl}/api/projects/${this.projectId}`;

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

  private async applyRemoteDiff(signal: AbortSignal): Promise<void> {
    if (!this.lastSyncStateVector) {
      return;
    }

    const diffResponse = await fetch(
      `${this.baseUrl}/api/projects/${this.projectId}/diff?fromVersion=${this.version}`,
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
        signal,
      },
    );

    if (diffResponse.status !== 200) {
      return;
    }

    this.unackedDiff = Y.encodeStateAsUpdate(
      this.doc,
      this.lastSyncStateVector,
    );

    const responseBuffer = await diffResponse.arrayBuffer();
    const { stateVector: serverStateVector, diff: serverDiff } =
      this.parseEncodedResponse(responseBuffer);

    const currentVersion = parseInt(
      diffResponse.headers.get("X-Version") || "0",
    );

    Y.applyUpdate(this.doc, serverDiff);
    this.version = currentVersion;

    this.lastSyncStateVector = serverStateVector;

    if (this.unackedDiff) {
      Y.applyUpdate(this.doc, this.unackedDiff);
    }

    this.unackedDiff = Y.encodeStateAsUpdate(
      this.doc,
      this.lastSyncStateVector,
    );

    return;
  }

  private async commitToRemote(signal: AbortSignal): Promise<void> {
    if (!this.lastSyncStateVector) {
      return;
    }

    const localDiff = Y.encodeStateAsUpdate(this.doc, this.lastSyncStateVector);
    if (localDiff.length > 0) {
      this.unackedDiff = new Uint8Array(localDiff);
    }

    if (this.unackedDiff && this.unackedDiff.length > 0) {
      const body = new Uint8Array(this.unackedDiff);

      const patchResponse = await fetch(
        `${this.baseUrl}/api/projects/${this.projectId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/octet-stream",
            "If-Match": this.version.toString(),
          },
          body,
          signal,
        },
      );

      if (patchResponse.status === 409) {
        return;
      }

      if (!patchResponse.ok) {
        throw new Error(
          `PATCH failed: ${patchResponse.status} ${patchResponse.statusText}`,
        );
      }

      await this.applyServerResponse(patchResponse);
      return;
    }
  }

  async sync(signal: AbortSignal): Promise<void> {
    if (!this.lastSyncStateVector) {
      await this.cloneDoc(signal);
      return;
    }

    await this.applyRemoteDiff(signal);
    await this.commitToRemote(signal);
  }

  private parseEncodedResponse(responseBuffer: ArrayBuffer): {
    stateVector: Uint8Array;
    diff: Uint8Array;
  } {
    const responseArray = new Uint8Array(responseBuffer);
    const view = new DataView(responseBuffer);

    const stateVectorLength = view.getUint32(0, BIG_ENDIAN);

    const stateVector = responseArray.slice(
      STATE_VECTOR_LENGTH_BYTES,
      STATE_VECTOR_LENGTH_BYTES + stateVectorLength,
    );

    const diff = responseArray.slice(
      STATE_VECTOR_LENGTH_BYTES + stateVectorLength,
    );

    return { stateVector, diff };
  }

  private async applyServerResponse(response: Response): Promise<void> {
    const versionHeader = response.headers.get("X-Version");
    if (versionHeader) {
      this.version = parseInt(versionHeader, 10);
    }

    const buffer = await response.arrayBuffer();
    const update = new Uint8Array(buffer);
    Y.applyUpdate(this.doc, update);

    this.lastSyncStateVector = Y.encodeStateVector(this.doc);

    this.unackedDiff = null;
  }
}
