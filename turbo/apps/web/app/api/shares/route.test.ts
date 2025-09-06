import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { initServices } from "../../../src/lib/init-services";
import { SHARE_LINKS_TBL } from "../../../src/db/schema/share-links";
import { PROJECTS_TBL } from "../../../src/db/schema/projects";
import { eq } from "drizzle-orm";
import * as Y from "yjs";

// Mock Clerk authentication
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
const mockAuth = vi.mocked(auth);

describe("/api/shares", () => {
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

  describe("GET /api/shares", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockAuth.mockResolvedValue({ userId: null } as Awaited<
        ReturnType<typeof auth>
      >);

      const request = new NextRequest("http://localhost:3000/api/shares");
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData).toMatchObject({
        error: "unauthorized",
      });
    });

    it("should return empty array when user has no shares", async () => {
      const request = new NextRequest("http://localhost:3000/api/shares");
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toMatchObject({
        shares: [],
      });
    });

    it("should return list of user's shares", async () => {
      // Create test share links
      const shareId1 = `share-${Date.now()}-1`;
      const shareId2 = `share-${Date.now()}-2`;
      const token1 = `token-${Date.now()}-1`;
      const token2 = `token-${Date.now()}-2`;

      await globalThis.services.db.insert(SHARE_LINKS_TBL).values([
        {
          id: shareId1,
          token: token1,
          projectId,
          filePath: "src/file1.ts",
          userId,
          accessedCount: 5,
          lastAccessedAt: new Date("2024-01-01"),
        },
        {
          id: shareId2,
          token: token2,
          projectId,
          filePath: "src/file2.ts",
          userId,
          accessedCount: 0,
        },
      ]);

      const request = new NextRequest("http://localhost:3000/api/shares", {
        headers: {
          origin: "http://localhost:3000",
        },
      });
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.shares).toHaveLength(2);
      
      // Check first share
      const share1 = responseData.shares.find((s: any) => s.id === shareId1);
      expect(share1).toMatchObject({
        id: shareId1,
        url: `http://localhost:3000/share/${token1}`,
        token: token1,
        project_id: projectId,
        file_path: "src/file1.ts",
        accessed_count: 5,
        created_at: expect.any(String),
        last_accessed_at: expect.any(String),
      });

      // Check second share
      const share2 = responseData.shares.find((s: any) => s.id === shareId2);
      expect(share2).toMatchObject({
        id: shareId2,
        url: `http://localhost:3000/share/${token2}`,
        token: token2,
        project_id: projectId,
        file_path: "src/file2.ts",
        accessed_count: 0,
        created_at: expect.any(String),
        last_accessed_at: null,
      });
    });

    it("should only return shares for authenticated user", async () => {
      // Create shares for different users
      const shareId1 = `share-${Date.now()}-1`;
      const shareId2 = `share-${Date.now()}-2`;
      const token1 = `token-${Date.now()}-1`;
      const token2 = `token-${Date.now()}-2`;

      await globalThis.services.db.insert(SHARE_LINKS_TBL).values([
        {
          id: shareId1,
          token: token1,
          projectId,
          filePath: "src/file1.ts",
          userId,
        },
        {
          id: shareId2,
          token: token2,
          projectId,
          filePath: "src/file2.ts",
          userId: otherUserId, // Different user
        },
      ]);

      const request = new NextRequest("http://localhost:3000/api/shares");
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.shares).toHaveLength(1);
      expect(responseData.shares[0].id).toBe(shareId1);
    });

    it("should order shares by creation date (newest first)", async () => {
      // Create shares with different creation times
      const oldDate = new Date("2024-01-01");
      const newDate = new Date("2024-01-10");
      
      const shareId1 = `share-old-${Date.now()}`;
      const shareId2 = `share-new-${Date.now()}`;

      // Insert older share first
      await globalThis.services.db.insert(SHARE_LINKS_TBL).values({
        id: shareId1,
        token: `token-old-${Date.now()}`,
        projectId,
        filePath: "old.ts",
        userId,
        createdAt: oldDate,
      });

      // Insert newer share
      await globalThis.services.db.insert(SHARE_LINKS_TBL).values({
        id: shareId2,
        token: `token-new-${Date.now()}`,
        projectId,
        filePath: "new.ts",
        userId,
        createdAt: newDate,
      });

      const request = new NextRequest("http://localhost:3000/api/shares");
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.shares).toHaveLength(2);
      expect(responseData.shares[0].id).toBe(shareId2); // Newer first
      expect(responseData.shares[1].id).toBe(shareId1); // Older second
    });

    it("should handle missing origin header gracefully", async () => {
      const shareId = `share-${Date.now()}`;
      const token = `token-${Date.now()}`;

      await globalThis.services.db.insert(SHARE_LINKS_TBL).values({
        id: shareId,
        token,
        projectId,
        filePath: "test.ts",
        userId,
      });

      // Request without origin header
      const request = new NextRequest("http://localhost:3000/api/shares");
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.shares).toHaveLength(1);
      expect(responseData.shares[0].url).toBe(`https://uspark.dev/share/${token}`);
    });
  });
});