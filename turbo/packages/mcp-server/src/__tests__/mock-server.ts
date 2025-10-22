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

// MSW handlers for mocking HTTP requests
import { http, HttpResponse } from "msw";

export const handlers = [
  // Handle project GET requests
  http.get("*/api/projects/:projectId", ({ params }) => {
    const { projectId } = params;
    const data = mockServer.getProject(projectId as string);
    return HttpResponse.arrayBuffer(data.buffer, {
      status: 200,
      headers: { "Content-Type": "application/octet-stream" },
    });
  }),

  // Handle project PATCH requests
  http.patch("*/api/projects/:projectId", async ({ params, request }) => {
    const { projectId } = params;
    const body = await request.arrayBuffer();
    mockServer.patchProject(projectId as string, new Uint8Array(body));
    return new HttpResponse(null, { status: 200 });
  }),

  // Handle blob-store endpoint
  http.get("*/api/blob-store", () => {
    return HttpResponse.json({
      storeId: "mock-store-id",
    });
  }),

  // Handle blob token requests
  http.get("*/blob-token", () => {
    return HttpResponse.json({
      token: "mock-blob-token",
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      uploadUrl: "http://localhost:3000/api/blobs/upload",
      downloadUrlPrefix: "http://localhost:3000/api/blobs",
    });
  }),

  // Handle public blob storage URLs
  http.get(
    "*.public.blob.vercel-storage.com/projects/:projectId/:hash",
    ({ params }) => {
      const { hash } = params;
      const content = mockServer.getBlobContent(hash as string);

      if (content !== undefined) {
        return new HttpResponse(content, {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        });
      } else {
        return new HttpResponse("Blob not found", {
          status: 404,
          statusText: "Not Found",
        });
      }
    },
  ),
];
