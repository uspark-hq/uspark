import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { GET } from "./route";
import { initServices } from "../../../src/lib/init-services";
import { apiCall } from "../../../src/test/api-helpers";
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

    // Clean up test data - delete shares first due to FK constraints
    await globalThis.services.db
      .delete(SHARE_LINKS_TBL)
      .where(eq(SHARE_LINKS_TBL.userId, userId));
    await globalThis.services.db
      .delete(SHARE_LINKS_TBL)
      .where(eq(SHARE_LINKS_TBL.userId, otherUserId));

    // Also clean up projects created in previous test runs
    await globalThis.services.db
      .delete(PROJECTS_TBL)
      .where(eq(PROJECTS_TBL.userId, userId));
    await globalThis.services.db
      .delete(PROJECTS_TBL)
      .where(eq(PROJECTS_TBL.userId, otherUserId));

    // Mock successful authentication by default
    mockAuth.mockResolvedValue({ userId } as Awaited<ReturnType<typeof auth>>);
  });

  afterEach(async () => {
    // Clean up after each test - delete shares first due to FK constraints
    await globalThis.services.db
      .delete(SHARE_LINKS_TBL)
      .where(eq(SHARE_LINKS_TBL.userId, userId));
    await globalThis.services.db
      .delete(SHARE_LINKS_TBL)
      .where(eq(SHARE_LINKS_TBL.userId, otherUserId));

    await globalThis.services.db
      .delete(PROJECTS_TBL)
      .where(eq(PROJECTS_TBL.userId, userId));
    await globalThis.services.db
      .delete(PROJECTS_TBL)
      .where(eq(PROJECTS_TBL.userId, otherUserId));
  });

  it("should return empty array when user has no shares", async () => {
    const response = await apiCall(GET, "GET");

    expect(response.status).toBe(200);
    expect(response.data).toEqual({ shares: [] });
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

    // Create test shares with unique IDs
    const timestamp = Date.now();
    const share1 = {
      id: `share-1-${timestamp}`,
      token: `token-1-${timestamp}`,
      projectId,
      filePath: "src/file1.ts",
      userId,
      accessedCount: 5,
      createdAt: new Date("2024-01-01"),
    };

    const share2 = {
      id: `share-2-${timestamp}`,
      token: `token-2-${timestamp}`,
      projectId,
      filePath: "src/file2.ts",
      userId,
      accessedCount: 0,
      createdAt: new Date("2024-01-02"),
    };

    await globalThis.services.db
      .insert(SHARE_LINKS_TBL)
      .values([share1, share2]);

    const response = await apiCall(GET, "GET");

    expect(response.status).toBe(200);
    expect(response.data.shares).toHaveLength(2);

    // Should be ordered by createdAt desc (newest first)
    expect(response.data.shares[0]).toMatchObject({
      id: `share-2-${timestamp}`,
      token: `token-2-${timestamp}`,
      projectId,
      filePath: "src/file2.ts",
      url: expect.stringMatching(new RegExp(`/share/token-2-${timestamp}$`)),
      accessedCount: 0,
    });

    expect(response.data.shares[1]).toMatchObject({
      id: `share-1-${timestamp}`,
      token: `token-1-${timestamp}`,
      projectId,
      filePath: "src/file1.ts",
      url: expect.stringMatching(new RegExp(`/share/token-1-${timestamp}$`)),
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
      },
    ]);

    // Create shares for both users
    const timestamp = Date.now();
    await globalThis.services.db.insert(SHARE_LINKS_TBL).values([
      {
        id: `my-share-${timestamp}`,
        token: `my-token-${timestamp}`,
        projectId: myProjectId,
        filePath: "my-file.ts",
        userId,
      },
      {
        id: `other-share-${timestamp}`,
        token: `other-token-${timestamp}`,
        projectId: otherProjectId,
        filePath: "other-file.ts",
        userId: otherUserId,
      },
    ]);

    const response = await apiCall(GET, "GET");

    expect(response.status).toBe(200);
    expect(response.data.shares).toHaveLength(1);
    expect(response.data.shares[0].id).toBe(`my-share-${timestamp}`);

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
    mockAuth.mockResolvedValue({ userId: null } as Awaited<
      ReturnType<typeof auth>
    >);

    const response = await apiCall(GET, "GET");

    expect(response.status).toBe(401);
    expect(response.data).toEqual({ error: "unauthorized" });
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
    const timestamp = now;
    const shares = [
      {
        id: `old-share-${timestamp}`,
        token: `old-token-${timestamp}`,
        projectId: project1,
        filePath: "old.ts",
        userId,
        createdAt: new Date(now - 3600000), // 1 hour ago
      },
      {
        id: `new-share-${timestamp}`,
        token: `new-token-${timestamp}`,
        projectId: project2,
        filePath: "new.ts",
        userId,
        createdAt: new Date(now), // now
      },
      {
        id: `middle-share-${timestamp}`,
        token: `middle-token-${timestamp}`,
        projectId: project3,
        filePath: "middle.ts",
        userId,
        createdAt: new Date(now - 1800000), // 30 min ago
      },
    ];

    await globalThis.services.db.insert(SHARE_LINKS_TBL).values(shares);

    const response = await apiCall(GET, "GET");

    expect(response.status).toBe(200);
    expect(response.data.shares).toHaveLength(3);
    expect(response.data.shares[0].id).toBe(`new-share-${timestamp}`);
    expect(response.data.shares[1].id).toBe(`middle-share-${timestamp}`);
    expect(response.data.shares[2].id).toBe(`old-share-${timestamp}`);

    // Clean up
    await globalThis.services.db
      .delete(SHARE_LINKS_TBL)
      .where(eq(SHARE_LINKS_TBL.userId, userId));
    await globalThis.services.db
      .delete(PROJECTS_TBL)
      .where(eq(PROJECTS_TBL.userId, userId));
  });
});
