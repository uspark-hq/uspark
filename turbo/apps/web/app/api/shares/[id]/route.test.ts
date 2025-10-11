import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import "../../../../src/test/setup";
import { DELETE } from "./route";
import { POST as createProject } from "../../projects/route";
import { POST as createShare } from "../../share/route";
import { initServices } from "../../../../src/lib/init-services";
import { apiCall } from "../../../../src/test/api-helpers";
import { SHARE_LINKS_TBL } from "../../../../src/db/schema/share-links";
import { PROJECTS_TBL } from "../../../../src/db/schema/projects";
import { eq } from "drizzle-orm";
import * as Y from "yjs";
import { NextRequest } from "next/server";

// Mock Clerk authentication
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
const mockAuth = vi.mocked(auth);

describe("DELETE /api/shares/[id]", () => {
  const userId = `test-user-shares-delete-${Date.now()}-${process.pid}`;
  const otherUserId = `other-user-shares-delete-${Date.now()}-${process.pid}`;

  beforeEach(async () => {
    vi.clearAllMocks();
    initServices();

    // Clean up ALL test data for both users - delete shares first due to FK constraints
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

  it("should successfully delete user's own share", async () => {
    // Create project using API
    const createProjectRequest = new NextRequest("http://localhost:3000", {
      method: "POST",
      body: JSON.stringify({ name: "Test Project" }),
    });
    const projectResponse = await createProject(createProjectRequest);
    expect(projectResponse.status).toBe(201);
    const projectData = await projectResponse.json();
    const projectId = projectData.id;

    // Create a share using API
    const createShareRequest = new NextRequest("http://localhost:3000", {
      method: "POST",
      body: JSON.stringify({
        project_id: projectId,
        file_path: "test.ts",
      }),
    });
    const shareResponse = await createShare(createShareRequest);
    expect(shareResponse.status).toBe(200);
    const shareData = await shareResponse.json();
    const shareId = shareData.id;

    // Verify share exists
    const [shareBefore] = await globalThis.services.db
      .select()
      .from(SHARE_LINKS_TBL)
      .where(eq(SHARE_LINKS_TBL.id, shareId));
    expect(shareBefore).toBeDefined();

    // Delete the share
    const response = await apiCall(DELETE, "DELETE", { id: shareId });

    expect(response.status).toBe(200);
    expect(response.data).toEqual({ success: true });

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

  it("should return 404 when trying to delete another user's share", async () => {
    const shareId = `test-share-id-other-${Date.now()}`;

    // Create project for other user using direct DB (needed for different user)
    const projectId = `other-project-${Date.now()}`;
    const ydoc = new Y.Doc();
    const state = Y.encodeStateAsUpdate(ydoc);
    const base64Data = Buffer.from(state).toString("base64");

    // Direct DB insert needed here because we need to test with a different userId
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
    const response = await apiCall(DELETE, "DELETE", { id: shareId });

    expect(response.status).toBe(404);
    expect(response.data).toEqual({ error: "share_not_found" });

    // Verify share still exists
    const [shareAfter] = await globalThis.services.db
      .select()
      .from(SHARE_LINKS_TBL)
      .where(eq(SHARE_LINKS_TBL.id, shareId));
    expect(shareAfter).toBeDefined();
    expect(shareAfter!.userId).toBe(otherUserId);

    // Clean up
    await globalThis.services.db
      .delete(SHARE_LINKS_TBL)
      .where(eq(SHARE_LINKS_TBL.id, shareId));
    await globalThis.services.db
      .delete(PROJECTS_TBL)
      .where(eq(PROJECTS_TBL.id, projectId));
  });

  it("should only delete the specified share, not others", async () => {
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

    // Create multiple shares using API
    const createShare1Request = new NextRequest("http://localhost:3000", {
      method: "POST",
      body: JSON.stringify({
        project_id: project1,
        file_path: "file1.ts",
      }),
    });
    const share1Response = await createShare(createShare1Request);
    expect(share1Response.status).toBe(200);
    const share1Data = await share1Response.json();

    const createShare2Request = new NextRequest("http://localhost:3000", {
      method: "POST",
      body: JSON.stringify({
        project_id: project2,
        file_path: "file2.ts",
      }),
    });
    const share2Response = await createShare(createShare2Request);
    expect(share2Response.status).toBe(200);
    const share2Data = await share2Response.json();

    const createShare3Request = new NextRequest("http://localhost:3000", {
      method: "POST",
      body: JSON.stringify({
        project_id: project3,
        file_path: "file3.ts",
      }),
    });
    const share3Response = await createShare(createShare3Request);
    expect(share3Response.status).toBe(200);
    const share3Data = await share3Response.json();

    // Delete share-2
    const shareToDelete = share2Data.id;
    const response = await apiCall(DELETE, "DELETE", { id: shareToDelete });

    expect(response.status).toBe(200);

    // Verify only share-2 is deleted
    const remainingShares = await globalThis.services.db
      .select()
      .from(SHARE_LINKS_TBL)
      .where(eq(SHARE_LINKS_TBL.userId, userId));

    expect(remainingShares).toHaveLength(2);
    expect(remainingShares.map((s) => s.id).sort()).toEqual(
      [share1Data.id, share3Data.id].sort(),
    );

    // Clean up
    await globalThis.services.db
      .delete(SHARE_LINKS_TBL)
      .where(eq(SHARE_LINKS_TBL.userId, userId));
    await globalThis.services.db
      .delete(PROJECTS_TBL)
      .where(eq(PROJECTS_TBL.userId, userId));
  });
});
