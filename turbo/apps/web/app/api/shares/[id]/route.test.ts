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

describe("DELETE /api/shares/[id]", () => {
  const userId = "test-user-123";
  const otherUserId = "other-user-456";

  beforeEach(async () => {
    initServices();

    // Clean up ALL test data for both users
    await globalThis.services.db
      .delete(SHARE_LINKS_TBL)
      .where(eq(SHARE_LINKS_TBL.userId, userId));
    await globalThis.services.db
      .delete(SHARE_LINKS_TBL)
      .where(eq(SHARE_LINKS_TBL.userId, otherUserId));

    // Mock successful authentication by default
    mockAuth.mockResolvedValue({ userId } as Awaited<ReturnType<typeof auth>>);
  });

  it("should successfully delete user's own share", async () => {
    const shareId = "test-share-id";

    // Create project first
    const projectId = `test-project-${Date.now()}`;
    const ydoc = new Y.Doc();
    const state = Y.encodeStateAsUpdate(ydoc);
    const base64Data = Buffer.from(state).toString("base64");

    await globalThis.services.db.insert(PROJECTS_TBL).values({
      id: projectId,
      userId,
      ydocData: base64Data,
      version: 0,
    });

    // Create a share owned by the user
    await globalThis.services.db.insert(SHARE_LINKS_TBL).values({
      id: shareId,
      token: `test-token-${Date.now()}`,
      projectId,
      filePath: "test.ts",
      userId,
    });

    // Verify share exists
    const [shareBefore] = await globalThis.services.db
      .select()
      .from(SHARE_LINKS_TBL)
      .where(eq(SHARE_LINKS_TBL.id, shareId));
    expect(shareBefore).toBeDefined();

    // Delete the share
    const request = new NextRequest(
      "http://localhost:3000/api/shares/" + shareId,
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ id: shareId }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });

    // Verify share is deleted
    const [shareAfter] = await globalThis.services.db
      .select()
      .from(SHARE_LINKS_TBL)
      .where(eq(SHARE_LINKS_TBL.id, shareId));
    expect(shareAfter).toBeUndefined();

    // Clean up project
    await globalThis.services.db
      .delete(PROJECTS_TBL)
      .where(eq(PROJECTS_TBL.id, projectId));
  });

  it("should return 404 when trying to delete non-existent share", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/shares/non-existent",
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "non-existent" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toEqual({ error: "share_not_found" });
  });

  it("should return 404 when trying to delete another user's share", async () => {
    const shareId = "test-share-id-other";

    // Create project for other user
    const projectId = `other-project-${Date.now()}`;
    const ydoc = new Y.Doc();
    const state = Y.encodeStateAsUpdate(ydoc);
    const base64Data = Buffer.from(state).toString("base64");

    await globalThis.services.db.insert(PROJECTS_TBL).values({
      id: projectId,
      userId: otherUserId,
      ydocData: base64Data,
      version: 0,
    });

    // Create a share owned by another user
    await globalThis.services.db.insert(SHARE_LINKS_TBL).values({
      id: shareId,
      token: `other-token-${Date.now()}`,
      projectId,
      filePath: "other.ts",
      userId: otherUserId,
    });

    // Try to delete as current user
    const request = new NextRequest(
      "http://localhost:3000/api/shares/" + shareId,
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ id: shareId }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toEqual({ error: "share_not_found" });

    // Verify share still exists
    const [shareAfter] = await globalThis.services.db
      .select()
      .from(SHARE_LINKS_TBL)
      .where(eq(SHARE_LINKS_TBL.id, shareId));
    expect(shareAfter).toBeDefined();
    expect(shareAfter.userId).toBe(otherUserId);

    // Clean up
    await globalThis.services.db
      .delete(SHARE_LINKS_TBL)
      .where(eq(SHARE_LINKS_TBL.id, shareId));
    await globalThis.services.db
      .delete(PROJECTS_TBL)
      .where(eq(PROJECTS_TBL.id, projectId));
  });

  it("should return 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null } as Awaited<
      ReturnType<typeof auth>
    >);

    const shareId = "test-share-id";
    const request = new NextRequest(
      "http://localhost:3000/api/shares/" + shareId,
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ id: shareId }),
    });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: "unauthorized" });
  });

  it("should only delete the specified share, not others", async () => {
    // Create projects first
    const project1 = `project-1-${Date.now()}`;
    const project2 = `project-2-${Date.now()}`;
    const project3 = `project-3-${Date.now()}`;

    const ydoc = new Y.Doc();
    const state = Y.encodeStateAsUpdate(ydoc);
    const base64Data = Buffer.from(state).toString("base64");

    await globalThis.services.db.insert(PROJECTS_TBL).values([
      { id: project1, userId, ydocData: base64Data, version: 0 },
      { id: project2, userId, ydocData: base64Data, version: 0 },
      { id: project3, userId, ydocData: base64Data, version: 0 },
    ]);

    // Create multiple shares for the same user
    const shares = [
      {
        id: "share-1",
        token: "token-1",
        projectId: project1,
        filePath: "file1.ts",
        userId,
      },
      {
        id: "share-2",
        token: "token-2",
        projectId: project2,
        filePath: "file2.ts",
        userId,
      },
      {
        id: "share-3",
        token: "token-3",
        projectId: project3,
        filePath: "file3.ts",
        userId,
      },
    ];

    await globalThis.services.db.insert(SHARE_LINKS_TBL).values(shares);

    // Delete share-2
    const request = new NextRequest("http://localhost:3000/api/shares/share-2");
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "share-2" }),
    });

    expect(response.status).toBe(200);

    // Verify only share-2 is deleted
    const remainingShares = await globalThis.services.db
      .select()
      .from(SHARE_LINKS_TBL)
      .where(eq(SHARE_LINKS_TBL.userId, userId));

    expect(remainingShares).toHaveLength(2);
    expect(remainingShares.map((s) => s.id).sort()).toEqual([
      "share-1",
      "share-3",
    ]);

    // Clean up
    await globalThis.services.db
      .delete(SHARE_LINKS_TBL)
      .where(eq(SHARE_LINKS_TBL.userId, userId));
    await globalThis.services.db
      .delete(PROJECTS_TBL)
      .where(eq(PROJECTS_TBL.userId, userId));
  });
});

