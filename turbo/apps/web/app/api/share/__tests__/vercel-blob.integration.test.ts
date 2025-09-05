import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../[token]/route";
import { POST } from "../route";
import { initServices } from "../../../../src/lib/init-services";
import { getBlobStorage, resetBlobStorage } from "@uspark/core";
import { SHARE_LINKS_TBL } from "../../../../src/db/schema/share-links";
import { PROJECTS_TBL } from "../../../../src/db/schema/projects";
import { eq } from "drizzle-orm";
import * as Y from "yjs";
import { nanoid } from "nanoid";
import crypto from "crypto";

const TEST_TOKEN = "vercel_blob_rw_YhpThrd333QWN58N_rtEXpwvXzSNXORK2INmDAXcZfdN3im";

// Skip this entire test suite if BLOB_READ_WRITE_TOKEN is not available
const hasVercelBlobToken = process.env.BLOB_READ_WRITE_TOKEN === TEST_TOKEN;

describe.skipIf(!hasVercelBlobToken)("Vercel Blob Integration Tests", () => {
  const projectId = `test-blob-project-${Date.now()}`;
  const userId = "test-blob-user";
  const testFilePath = "src/blob-test.ts";
  const testFileContent = `// Test file for Vercel Blob integration
export function hello() {
  return "Hello from Vercel Blob!";
}

export const config = {
  feature: "blob-storage",
  version: "1.0.0"
};
`;
  const testToken = crypto.randomBytes(32).toString("base64url");
  const shareId = nanoid();

  beforeAll(() => {
    // Ensure we're using the test token
    process.env.BLOB_READ_WRITE_TOKEN = TEST_TOKEN;
  });

  afterAll(() => {
    // Clean up environment
    if (!hasVercelBlobToken) {
      delete process.env.BLOB_READ_WRITE_TOKEN;
    }
  });

  beforeEach(async () => {
    initServices();
    
    // Clean up any existing test data
    await globalThis.services.db
      .delete(SHARE_LINKS_TBL)
      .where(eq(SHARE_LINKS_TBL.projectId, projectId));
    await globalThis.services.db
      .delete(PROJECTS_TBL)
      .where(eq(PROJECTS_TBL.id, projectId));
  });

  describe("Blob Storage Service", () => {
    beforeEach(() => {
      resetBlobStorage();
    });

    it("should initialize Vercel Blob storage when token is available", () => {
      const blobStorage = getBlobStorage({ type: "vercel" });
      expect(blobStorage).toBeDefined();
    });

    it("should store and retrieve file content via hash", async () => {
      const blobStorage = getBlobStorage({ type: "vercel" });
      
      // Upload the content with random suffix to avoid conflicts
      const hash = await blobStorage.uploadBlob(Buffer.from(testFileContent), {
        contentType: "text/plain",
        addRandomSuffix: true
      });
      expect(hash).toBeDefined();

      // Retrieve the content
      const retrieved = await blobStorage.downloadBlob(hash);
      expect(retrieved).toBeDefined();
      expect(retrieved.toString("utf-8")).toBe(testFileContent);

      // Check if exists
      const exists = await blobStorage.exists(hash);
      expect(exists).toBe(true);

      // Clean up
      await blobStorage.delete(hash);
    });
  });

  describe("Share API with Vercel Blob", () => {
    beforeEach(async () => {
      // Create a test project with file data including blob storage
      const ydoc = new Y.Doc();
      const files = ydoc.getMap("files");
      const blobs = ydoc.getMap("blobs");
      
      // Store content in blob storage first to get the hash
      const blobStorage = getBlobStorage({ type: "vercel" });
      const hash = await blobStorage.uploadBlob(Buffer.from(testFileContent + Date.now()), {
        contentType: "text/plain",
        addRandomSuffix: true
      });
      
      // Set file metadata
      files.set(testFilePath, { hash, mtime: Date.now() });
      
      // Also store in YDoc blobs map for compatibility
      blobs.set(hash, testFileContent);

      const state = Y.encodeStateAsUpdate(ydoc);
      const base64Data = Buffer.from(state).toString("base64");

      await globalThis.services.db.insert(PROJECTS_TBL).values({
        id: projectId,
        userId,
        ydocData: base64Data,
        version: 0,
      });

      // Create a share link
      await globalThis.services.db.insert(SHARE_LINKS_TBL).values({
        id: shareId,
        token: testToken,
        projectId,
        filePath: testFilePath,
        userId,
        createdAt: new Date(),
      });
    });

    it("should return actual file content when Vercel Blob is configured", async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/share/${testToken}`,
      );
      const context = { params: Promise.resolve({ token: testToken }) };

      const response = await GET(request, context);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        project_name: projectId,
        file_path: testFilePath,
        hash: expect.any(String),
        mtime: expect.any(Number),
      });

      // If the API is updated to return content directly, test that
      // For now, we can test that we can retrieve content using the hash
      const blobStorage = getBlobStorage({ type: "vercel" });
      const content = await blobStorage.downloadBlob(data.hash);
      expect(content.toString("utf-8")).toBe(testFileContent);
    });

    it("should handle blob storage errors gracefully", async () => {
      // Create a share link with invalid hash
      const invalidHash = "invalid-hash-that-does-not-exist";
      const invalidShareId = nanoid();
      const invalidToken = crypto.randomBytes(32).toString("base64url");

      const ydoc = new Y.Doc();
      const files = ydoc.getMap("files");
      files.set(testFilePath, { hash: invalidHash, mtime: Date.now() });

      const state = Y.encodeStateAsUpdate(ydoc);
      const base64Data = Buffer.from(state).toString("base64");

      await globalThis.services.db.insert(PROJECTS_TBL).values({
        id: `${projectId}-invalid`,
        userId,
        ydocData: base64Data,
        version: 0,
      });

      await globalThis.services.db.insert(SHARE_LINKS_TBL).values({
        id: invalidShareId,
        token: invalidToken,
        projectId: `${projectId}-invalid`,
        filePath: testFilePath,
        userId,
        createdAt: new Date(),
      });

      const request = new NextRequest(
        `http://localhost:3000/api/share/${invalidToken}`,
      );
      const context = { params: Promise.resolve({ token: invalidToken }) };

      const response = await GET(request, context);
      // Should still return metadata successfully
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.hash).toBe(invalidHash);

      // But blob retrieval should fail gracefully
      const blobStorage = getBlobStorage({ type: "vercel" });
      const exists = await blobStorage.exists(invalidHash);
      expect(exists).toBe(false);
    });
  });

  describe("Share Creation with Blob Storage", () => {
    it("should create share links that work with blob storage", async () => {
      // First create a project with blob content
      const ydoc = new Y.Doc();
      const files = ydoc.getMap("files");
      const blobs = ydoc.getMap("blobs");
      
      // Store in blob storage first to get the hash  
      const blobStorage = getBlobStorage({ type: "vercel" });
      const uniqueContent = testFileContent + Date.now();
      const hash = await blobStorage.uploadBlob(Buffer.from(uniqueContent), {
        contentType: "text/plain",
        addRandomSuffix: true
      });
      
      files.set(testFilePath, { hash, mtime: Date.now() });
      blobs.set(hash, testFileContent);

      const state = Y.encodeStateAsUpdate(ydoc);
      const base64Data = Buffer.from(state).toString("base64");

      await globalThis.services.db.insert(PROJECTS_TBL).values({
        id: projectId,
        userId,
        ydocData: base64Data,
        version: 0,
      });

      // Mock authentication
      const mockAuth = await import("@clerk/nextjs/server");
      vi.mocked(mockAuth.auth).mockResolvedValue({ 
        userId 
      } as Awaited<ReturnType<typeof mockAuth.auth>>);

      // Create share request
      const shareRequest = new NextRequest(
        "http://localhost:3000/api/share",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: projectId,
            file_path: testFilePath,
          }),
        }
      );

      const shareResponse = await POST(shareRequest);
      expect(shareResponse.status).toBe(200);

      const shareData = await shareResponse.json();
      expect(shareData.token).toBeDefined();

      // Now test accessing the share
      const accessRequest = new NextRequest(
        `http://localhost:3000/api/share/${shareData.token}`,
      );
      const accessContext = { params: Promise.resolve({ token: shareData.token }) };

      const accessResponse = await GET(accessRequest, accessContext);
      expect(accessResponse.status).toBe(200);

      const accessData = await accessResponse.json();
      expect(accessData.hash).toBe(hash);

      // Verify content can be retrieved from blob storage
      const retrievedContent = await blobStorage.downloadBlob(hash);
      expect(retrievedContent.toString("utf-8")).toBe(uniqueContent);
    });
  });
});