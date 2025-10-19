import { Doc, encodeStateAsUpdate, applyUpdate } from "yjs";
import type { FileNode, BlobInfo } from "@uspark/core";
import { sha256 } from "js-sha256";

class MockYjsServer {
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

  addFileToProject(projectId: string, filePath: string, content: string): void {
    let project = this.projects.get(projectId);
    if (!project) {
      project = new Doc();
      this.projects.set(projectId, project);
    }

    const files = project.getMap("files");
    const blobs = project.getMap("blobs");

    const hash = this.computeHash(content);

    const fileNode: FileNode = {
      hash,
      mtime: Date.now(),
    };
    files.set(filePath, fileNode);

    const blobInfo: BlobInfo = {
      size: content.length,
    };
    blobs.set(hash, blobInfo);

    this.blobStorage.set(hash, content);
  }

  getBlobContent(hash: string): string | undefined {
    return this.blobStorage.get(hash);
  }

  getProjectDoc(projectId: string): Doc | undefined {
    return this.projects.get(projectId);
  }

  hasFile(projectId: string, filePath: string): boolean {
    const project = this.projects.get(projectId);
    if (!project) return false;

    const files = project.getMap("files");
    return files.has(filePath);
  }

  getAllFiles(projectId: string): string[] {
    const project = this.projects.get(projectId);
    if (!project) return [];

    const files = project.getMap("files");
    return Array.from(files.keys());
  }

  reset(): void {
    this.projects.clear();
    this.blobStorage.clear();
  }

  private computeHash(content: string): string {
    return sha256(content);
  }
}

export const mockServer = new MockYjsServer();

// Mock fetch for tests
const originalFetch =
  global.fetch || (() => Promise.reject(new Error("Fetch not available")));

global.fetch = async (url: string | URL | Request, init?: RequestInit) => {
  const urlStr = url.toString();

  // Handle project GET/PATCH requests
  if (urlStr.includes("/api/projects/")) {
    const match = urlStr.match(/\/api\/projects\/([^/?]+)/);
    if (match && match[1]) {
      const projectId = match[1];

      if (init?.method === "PATCH") {
        const body = init.body;
        if (body instanceof Buffer) {
          mockServer.patchProject(projectId, new Uint8Array(body));
        } else if (body instanceof Uint8Array) {
          mockServer.patchProject(projectId, body);
        }
        return new Response(null, { status: 200 });
      } else {
        const data = mockServer.getProject(projectId);
        return new Response(data, {
          status: 200,
          headers: { "Content-Type": "application/octet-stream" },
        });
      }
    }
  }

  // Handle blob-store endpoint
  if (urlStr.includes("/api/blob-store")) {
    return new Response(
      JSON.stringify({
        storeId: "mock-store-id",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // Handle blob token requests
  if (urlStr.includes("/blob-token")) {
    return new Response(
      JSON.stringify({
        token: "mock-blob-token",
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        uploadUrl: "http://localhost:3000/api/blobs/upload",
        downloadUrlPrefix: "http://localhost:3000/api/blobs",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // Handle public blob storage URLs
  if (urlStr.includes(".public.blob.vercel-storage.com/projects/")) {
    const match = urlStr.match(/projects\/([^/]+)\/([^/?]+)$/);
    if (match && match[2]) {
      const hash = match[2];
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

  return originalFetch(url, init);
};
