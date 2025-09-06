import { describe, it, expect, beforeEach, vi } from "vitest";
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

describe("GET /api/shares", () => {
  const userId = "test-user-123";
  const otherUserId = "other-user-456";
  
  beforeEach(async () => {
    initServices();
    
    // Clean up test data
    await globalThis.services.db
      .delete(SHARE_LINKS_TBL)
      .where(eq(SHARE_LINKS_TBL.userId, userId));
    await globalThis.services.db
      .delete(SHARE_LINKS_TBL)
      .where(eq(SHARE_LINKS_TBL.userId, otherUserId));
    
    // Mock successful authentication by default
    mockAuth.mockResolvedValue({ userId } as Awaited<ReturnType<typeof auth>>);
  });

  it("should return empty array when user has no shares", async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ shares: [] });
  });

  it("should return user's shares with correct structure", async () => {
    // Create test project
    const projectId = `test-project-${Date.now()}`;
    const ydoc = new Y.Doc();
    const files = ydoc.getMap("files");
    files.set("test.ts", { hash: "abc123", mtime: Date.now() });
    
    const state = Y.encodeStateAsUpdate(ydoc);
    const base64Data = Buffer.from(state).toString("base64");
    
    await globalThis.services.db.insert(PROJECTS_TBL).values({
      id: projectId,
      userId,
      ydocData: base64Data,
      version: 0,
    });

    // Create test shares
    const share1 = {
      id: "share-1",
      token: "token-1",
      projectId,
      filePath: "src/file1.ts",
      userId,
      accessedCount: 5,
      createdAt: new Date("2024-01-01"),
    };

    const share2 = {
      id: "share-2", 
      token: "token-2",
      projectId,
      filePath: "src/file2.ts",
      userId,
      accessedCount: 0,
      createdAt: new Date("2024-01-02"),
    };

    await globalThis.services.db.insert(SHARE_LINKS_TBL).values([share1, share2]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.shares).toHaveLength(2);
    
    // Should be ordered by createdAt desc (newest first)
    expect(data.shares[0]).toMatchObject({
      id: "share-2",
      token: "token-2",
      projectId,
      filePath: "src/file2.ts",
      url: expect.stringMatching(/\/share\/token-2$/),
      accessedCount: 0,
    });
    
    expect(data.shares[1]).toMatchObject({
      id: "share-1",
      token: "token-1",
      projectId,
      filePath: "src/file1.ts",
      url: expect.stringMatching(/\/share\/token-1$/),
      accessedCount: 5,
    });

    // Clean up - delete shares first due to foreign key constraint
    await globalThis.services.db
      .delete(SHARE_LINKS_TBL)
      .where(eq(SHARE_LINKS_TBL.projectId, projectId));
    await globalThis.services.db
      .delete(PROJECTS_TBL)
      .where(eq(PROJECTS_TBL.id, projectId));
  });

  it("should not return shares from other users", async () => {
    // Create projects for different users
    const myProjectId = `my-project-${Date.now()}`;
    const otherProjectId = `other-project-${Date.now()}`;
    
    const ydoc = new Y.Doc();
    const state = Y.encodeStateAsUpdate(ydoc);
    const base64Data = Buffer.from(state).toString("base64");
    
    // Create both projects
    await globalThis.services.db.insert(PROJECTS_TBL).values([
      {
        id: myProjectId,
        userId,
        ydocData: base64Data,
        version: 0,
      },
      {
        id: otherProjectId,
        userId: otherUserId,
        ydocData: base64Data,
        version: 0,
      }
    ]);

    // Create shares for both users
    await globalThis.services.db.insert(SHARE_LINKS_TBL).values([
      {
        id: "my-share",
        token: "my-token",
        projectId: myProjectId,
        filePath: "my-file.ts",
        userId,
      },
      {
        id: "other-share",
        token: "other-token",
        projectId: otherProjectId,
        filePath: "other-file.ts",
        userId: otherUserId,
      },
    ]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.shares).toHaveLength(1);
    expect(data.shares[0].id).toBe("my-share");

    // Clean up - delete shares first, then projects
    await globalThis.services.db
      .delete(SHARE_LINKS_TBL)
      .where(eq(SHARE_LINKS_TBL.userId, userId));
    await globalThis.services.db
      .delete(SHARE_LINKS_TBL)
      .where(eq(SHARE_LINKS_TBL.userId, otherUserId));
    await globalThis.services.db
      .delete(PROJECTS_TBL)
      .where(eq(PROJECTS_TBL.id, myProjectId));
    await globalThis.services.db
      .delete(PROJECTS_TBL)
      .where(eq(PROJECTS_TBL.id, otherProjectId));
  });

  it("should return 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null } as Awaited<ReturnType<typeof auth>>);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: "unauthorized" });
  });

  it("should order shares by creation date descending", async () => {
    // Create projects for the shares
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

    const now = Date.now();
    const shares = [
      {
        id: "old-share",
        token: "old-token",
        projectId: project1,
        filePath: "old.ts",
        userId,
        createdAt: new Date(now - 3600000), // 1 hour ago
      },
      {
        id: "new-share",
        token: "new-token",
        projectId: project2,
        filePath: "new.ts",
        userId,
        createdAt: new Date(now), // now
      },
      {
        id: "middle-share",
        token: "middle-token",
        projectId: project3,
        filePath: "middle.ts",
        userId,
        createdAt: new Date(now - 1800000), // 30 min ago
      },
    ];

    await globalThis.services.db.insert(SHARE_LINKS_TBL).values(shares);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.shares).toHaveLength(3);
    expect(data.shares[0].id).toBe("new-share");
    expect(data.shares[1].id).toBe("middle-share");
    expect(data.shares[2].id).toBe("old-share");

    // Clean up
    await globalThis.services.db
      .delete(SHARE_LINKS_TBL)
      .where(eq(SHARE_LINKS_TBL.userId, userId));
    await globalThis.services.db
      .delete(PROJECTS_TBL)
      .where(eq(PROJECTS_TBL.userId, userId));
  });
});