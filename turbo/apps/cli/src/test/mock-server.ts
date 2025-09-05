import { Doc, encodeStateAsUpdate, applyUpdate } from "yjs";
import type { FileNode, BlobInfo } from "@uspark/core";
import { createHash } from "crypto";

export class MockYjsServer {
  private projects = new Map<string, Doc>();
  private blobStorage = new Map<string, string>();

  getProject(projectId: string): Uint8Array {
    let project = this.projects.get(projectId);
    if (!project) {
      // Create empty project if it doesn't exist
      project = new Doc();
      this.projects.set(projectId, project);
    }

    return encodeStateAsUpdate(project);
  }

  patchProject(projectId: string, update: Uint8Array): void {
    let project = this.projects.get(projectId);
    if (!project) {
      project = new Doc();
      this.projects.set(projectId, project);
    }

    applyUpdate(project, update);
  }

  // Helper methods for testing setup
  addFileToProject(projectId: string, filePath: string, content: string): void {
    let project = this.projects.get(projectId);
    if (!project) {
      project = new Doc();
      this.projects.set(projectId, project);
    }

    const files = project.getMap("files");
    const blobs = project.getMap("blobs");

    // Compute hash (using real SHA256 to match FileSystem)
    const hash = this.computeHash(content);

    // Store file metadata
    const fileNode: FileNode = {
      hash,
      mtime: Date.now(),
    };
    files.set(filePath, fileNode);

    // Store blob metadata
    const blobInfo: BlobInfo = {
      size: content.length,
    };
    blobs.set(hash, blobInfo);

    // Store actual content
    this.blobStorage.set(hash, content);
  }

  getBlobContent(hash: string): string | undefined {
    return this.blobStorage.get(hash);
  }

  reset(): void {
    this.projects.clear();
    this.blobStorage.clear();
  }

  private computeHash(content: string): string {
    // Use real SHA256 hash to match the FileSystem implementation
    return createHash("sha256").update(Buffer.from(content)).digest("hex");
  }
}

// Global instance for tests
export const mockServer = new MockYjsServer();

// Mock fetch for tests
const originalFetch =
  global.fetch || (() => Promise.reject(new Error("Fetch not available")));

global.fetch = async (url: string | URL | Request, init?: RequestInit) => {
  const urlStr = url.toString();

  // Handle project GET/PATCH requests
  if (urlStr.includes("/api/projects/")) {
    const match = urlStr.match(/\/api\/projects\/([^/]+)/);
    if (match && match[1]) {
      const projectId = match[1];

      if (init?.method === "PATCH") {
        // Handle project update
        const body = init.body;
        if (body instanceof Buffer) {
          mockServer.patchProject(projectId, new Uint8Array(body));
        } else if (body instanceof Uint8Array) {
          mockServer.patchProject(projectId, body);
        }
        return new Response(null, { status: 200 });
      } else {
        // Handle project fetch
        const data = mockServer.getProject(projectId);
        return new Response(data, {
          status: 200,
          headers: { "Content-Type": "application/octet-stream" },
        });
      }
    }
  }

  // Handle blob requests
  if (urlStr.includes("/api/blobs/")) {
    const match = urlStr.match(/\/api\/blobs\/([^/]+)/);
    if (match && match[1]) {
      const hash = match[1];
      const content = mockServer.getBlobContent(hash);

      if (content !== undefined) {
        return new Response(content, {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        });
      } else {
        return new Response("Blob not found", {
          status: 404,
          statusText: "Not Found",
        });
      }
    }
  }

  // Fallback to original fetch for other requests
  return originalFetch(url, init);
};
