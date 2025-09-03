import { Doc, encodeStateAsUpdate, applyUpdate } from "yjs";
import type { FileNode, BlobInfo } from "@uspark/core";

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

    // Compute hash (simple for testing)
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
    // Simple hash for testing - in real implementation would use crypto
    return `hash_${content.length}_${content.slice(0, 10)}`;
  }
}

// Global instance for tests
export const mockServer = new MockYjsServer();
