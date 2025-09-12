import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { GET } from "./route";
import { POST as createProject } from "../projects/route";
import { initServices } from "../../../src/lib/init-services";
import { apiCall } from "../../../src/test/api-helpers";
import { SHARE_LINKS_TBL } from "../../../src/db/schema/share-links";
import { PROJECTS_TBL } from "../../../src/db/schema/projects";
import { eq } from "drizzle-orm";
import * as Y from "yjs";
import { NextRequest } from "next/server";

// Mock Clerk authentication
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
const mockAuth = vi.mocked(auth);

describe("GET /api/shares", () => {
  const userId = `test-user-shares-route-${Date.now()}-${process.pid}`;
  const otherUserId = `other-user-shares-route-${Date.now()}-${process.pid}`;

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
    // Create test project using API
    const createProjectRequest = new NextRequest("http://localhost:3000", {
      method: "POST",
      body: JSON.stringify({ name: "Test Project" }),
    });
    const projectResponse = await createProject(createProjectRequest);
    expect(projectResponse.status).toBe(201);
    const projectData = await projectResponse.json();
    const projectId = projectData.id;

    // Update project with test data
    const ydoc = new Y.Doc();
    const files = ydoc.getMap("files");
    files.set("test.ts", { hash: "abc123", mtime: Date.now() });
    const state = Y.encodeStateAsUpdate(ydoc);
    const base64Data = Buffer.from(state).toString("base64");

    await globalThis.services.db
      .update(PROJECTS_TBL)
      .set({ ydocData: base64Data })
      .where(eq(PROJECTS_TBL.id, projectId));

    // Create test shares with unique IDs
    const timestamp = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
    // Create project for current user using API
    const createMyProjectRequest = new NextRequest("http://localhost:3000", {
      method: "POST",
      body: JSON.stringify({ name: "My Project" }),
    });
    const myProjectResponse = await createProject(createMyProjectRequest);
    expect(myProjectResponse.status).toBe(201);
    const myProjectData = await myProjectResponse.json();
    const myProjectId = myProjectData.id;

    // Create project for other user using direct DB (needed for different user)
    const otherProjectId = `other-project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const ydoc = new Y.Doc();
    const state = Y.encodeStateAsUpdate(ydoc);
    const base64Data = Buffer.from(state).toString("base64");

    // Direct DB insert needed here because we need to test with a different userId
    await globalThis.services.db.insert(PROJECTS_TBL).values({
      id: otherProjectId,
      userId: otherUserId,
      ydocData: base64Data,
      version: 0,
    });

    // Create shares for both users
    const timestamp = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
    // Create projects using API
    const createProject1Request = new NextRequest("http://localhost:3000", {
      method: "POST",
      body: JSON.stringify({ name: "Project 1" }),
    });
    const project1Response = await createProject(createProject1Request);
    expect(project1Response.status).toBe(201);
    const project1Data = await project1Response.json();
    const project1 = project1Data.id;

    const createProject2Request = new NextRequest("http://localhost:3000", {
      method: "POST",
      body: JSON.stringify({ name: "Project 2" }),
    });
    const project2Response = await createProject(createProject2Request);
    expect(project2Response.status).toBe(201);
    const project2Data = await project2Response.json();
    const project2 = project2Data.id;

    const createProject3Request = new NextRequest("http://localhost:3000", {
      method: "POST",
      body: JSON.stringify({ name: "Project 3" }),
    });
    const project3Response = await createProject(createProject3Request);
    expect(project3Response.status).toBe(201);
    const project3Data = await project3Response.json();
    const project3 = project3Data.id;

    const now = Date.now();
    const timestamp = `${now}-${Math.random().toString(36).substr(2, 9)}`;
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
