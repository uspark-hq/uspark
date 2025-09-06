import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { DELETE } from "./route";
import { initServices } from "../../../../src/lib/init-services";
import { SHARE_LINKS_TBL } from "../../../../src/db/schema/share-links";
import { PROJECTS_TBL } from "../../../../src/db/schema/projects";
import { eq } from "drizzle-orm";
import * as Y from "yjs";

// Mock Clerk authentication
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
const mockAuth = vi.mocked(auth);

describe("/api/shares/[id]", () => {
  const userId = "test-user";
  const otherUserId = "other-user";
  const projectId = `test-project-${Date.now()}`;
  const testFilePath = "src/test.ts";

  beforeEach(async () => {
    // Clean up any existing test data
    initServices();
    
    // Clean up share links for test users
    await globalThis.services.db
      .delete(SHARE_LINKS_TBL)
      .where(eq(SHARE_LINKS_TBL.userId, userId));
    await globalThis.services.db
      .delete(SHARE_LINKS_TBL)
      .where(eq(SHARE_LINKS_TBL.userId, otherUserId));
    
    // Clean up test project
    await globalThis.services.db
      .delete(PROJECTS_TBL)
      .where(eq(PROJECTS_TBL.id, projectId));

    // Create test project
    const ydoc = new Y.Doc();
    const files = ydoc.getMap("files");
    files.set(testFilePath, { hash: "abc123", mtime: Date.now() });
    const state = Y.encodeStateAsUpdate(ydoc);
    const base64Data = Buffer.from(state).toString("base64");

    await globalThis.services.db.insert(PROJECTS_TBL).values({
      id: projectId,
      userId,
      ydocData: base64Data,
      version: 0,
    });

    // Mock successful authentication by default
    mockAuth.mockResolvedValue({ userId } as Awaited<ReturnType<typeof auth>>);
  });

  describe("DELETE /api/shares/[id]", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockAuth.mockResolvedValue({ userId: null } as Awaited<
        ReturnType<typeof auth>
      >);

      const request = new NextRequest("http://localhost:3000/api/shares/test-share-id");
      const response = await DELETE(request, { params: { id: "test-share-id" } });
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData).toMatchObject({
        error: "unauthorized",
      });
    });

    it("should return 400 when share ID is missing", async () => {
      const request = new NextRequest("http://localhost:3000/api/shares/");
      const response = await DELETE(request, { params: { id: "" } });
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData).toMatchObject({
        error: "invalid_request",
        error_description: "Share ID is required",
      });
    });

    it("should return 404 when share does not exist", async () => {
      const request = new NextRequest("http://localhost:3000/api/shares/non-existent-id");
      const response = await DELETE(request, { params: { id: "non-existent-id" } });
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData).toMatchObject({
        error: "share_not_found",
        error_description: "Share not found or you don't have permission to delete it",
      });
    });

    it("should return 404 when share belongs to different user", async () => {
      // Create share for different user
      const shareId = `share-${Date.now()}`;
      const token = `token-${Date.now()}`;

      await globalThis.services.db.insert(SHARE_LINKS_TBL).values({
        id: shareId,
        token,
        projectId,
        filePath: testFilePath,
        userId: otherUserId, // Different user
      });

      const request = new NextRequest(`http://localhost:3000/api/shares/${shareId}`);
      const response = await DELETE(request, { params: { id: shareId } });
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData).toMatchObject({
        error: "share_not_found",
        error_description: "Share not found or you don't have permission to delete it",
      });

      // Verify share was not deleted
      const [shareLink] = await globalThis.services.db
        .select()
        .from(SHARE_LINKS_TBL)
        .where(eq(SHARE_LINKS_TBL.id, shareId));

      expect(shareLink).toBeDefined();
    });

    it("should successfully delete share when user owns it", async () => {
      // Create share for current user
      const shareId = `share-${Date.now()}`;
      const token = `token-${Date.now()}`;

      await globalThis.services.db.insert(SHARE_LINKS_TBL).values({
        id: shareId,
        token,
        projectId,
        filePath: testFilePath,
        userId,
      });

      // Verify share exists before deletion
      const [shareBeforeDelete] = await globalThis.services.db
        .select()
        .from(SHARE_LINKS_TBL)
        .where(eq(SHARE_LINKS_TBL.id, shareId));

      expect(shareBeforeDelete).toBeDefined();

      const request = new NextRequest(`http://localhost:3000/api/shares/${shareId}`);
      const response = await DELETE(request, { params: { id: shareId } });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toMatchObject({
        success: true,
        message: "Share link revoked successfully",
      });

      // Verify share was deleted
      const [shareAfterDelete] = await globalThis.services.db
        .select()
        .from(SHARE_LINKS_TBL)
        .where(eq(SHARE_LINKS_TBL.id, shareId));

      expect(shareAfterDelete).toBeUndefined();
    });

    it("should only delete the specified share, not other shares", async () => {
      // Create multiple shares
      const shareId1 = `share-${Date.now()}-1`;
      const shareId2 = `share-${Date.now()}-2`;
      const token1 = `token-${Date.now()}-1`;
      const token2 = `token-${Date.now()}-2`;

      await globalThis.services.db.insert(SHARE_LINKS_TBL).values([
        {
          id: shareId1,
          token: token1,
          projectId,
          filePath: "file1.ts",
          userId,
        },
        {
          id: shareId2,
          token: token2,
          projectId,
          filePath: "file2.ts",
          userId,
        },
      ]);

      // Delete first share
      const request = new NextRequest(`http://localhost:3000/api/shares/${shareId1}`);
      const response = await DELETE(request, { params: { id: shareId1 } });
      
      expect(response.status).toBe(200);

      // Verify first share was deleted
      const [share1] = await globalThis.services.db
        .select()
        .from(SHARE_LINKS_TBL)
        .where(eq(SHARE_LINKS_TBL.id, shareId1));

      expect(share1).toBeUndefined();

      // Verify second share still exists
      const [share2] = await globalThis.services.db
        .select()
        .from(SHARE_LINKS_TBL)
        .where(eq(SHARE_LINKS_TBL.id, shareId2));

      expect(share2).toBeDefined();
      expect(share2?.id).toBe(shareId2);
    });

    it("should handle sequential deletion attempts gracefully", async () => {
      // Create a share
      const shareId = `share-${Date.now()}`;
      const token = `token-${Date.now()}`;

      await globalThis.services.db.insert(SHARE_LINKS_TBL).values({
        id: shareId,
        token,
        projectId,
        filePath: testFilePath,
        userId,
      });

      // First deletion should succeed
      const request1 = new NextRequest(`http://localhost:3000/api/shares/${shareId}`);
      const response1 = await DELETE(request1, { params: { id: shareId } });
      expect(response1.status).toBe(200);

      // Second deletion should get 404
      const request2 = new NextRequest(`http://localhost:3000/api/shares/${shareId}`);
      const response2 = await DELETE(request2, { params: { id: shareId } });
      expect(response2.status).toBe(404);

      // Verify share was deleted
      const [share] = await globalThis.services.db
        .select()
        .from(SHARE_LINKS_TBL)
        .where(eq(SHARE_LINKS_TBL.id, shareId));

      expect(share).toBeUndefined();
    });
  });
});