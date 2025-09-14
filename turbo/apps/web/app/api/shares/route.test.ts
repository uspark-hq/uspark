import { describe, it, expect, beforeEach, vi } from "vitest";
import "../../../src/test/setup";
import { GET } from "./route";
import { POST as createProject } from "../projects/route";
import { POST as createShare } from "../share/route";
import { apiCall } from "../../../src/test/api-helpers";
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
  const userId = `test-user-shares-route-${Date.now()}-${process.pid}`;
  const createdProjectIds: string[] = [];
  const createdShareIds: string[] = [];

  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock successful authentication by default
    mockAuth.mockResolvedValue({ userId } as Awaited<ReturnType<typeof auth>>);

    // Clear tracking arrays
    createdProjectIds.length = 0;
    createdShareIds.length = 0;
  });

  it("should return empty array when user has no shares", async () => {
    const response = await apiCall(GET, "GET");

    expect(response.status).toBe(200);
    expect(response.data).toEqual({ shares: [] });
  });

  it("should return user's shares with correct structure", async () => {
    // Create test project using API
    const projectResponse = await apiCall(
      createProject,
      "POST",
      {},
      { name: "Test Project" },
    );
    expect(projectResponse.status).toBe(201);
    const projectId = projectResponse.data.id;
    createdProjectIds.push(projectId);

    // Create test shares using API
    const share1Response = await apiCall(
      createShare,
      "POST",
      {},
      { project_id: projectId, file_path: "src/file1.ts" },
    );
    expect(share1Response.status).toBe(201);
    createdShareIds.push(share1Response.data.id);

    const share2Response = await apiCall(
      createShare,
      "POST",
      {},
      { project_id: projectId, file_path: "src/file2.ts" },
    );
    expect(share2Response.status).toBe(201);
    createdShareIds.push(share2Response.data.id);

    const response = await apiCall(GET, "GET");

    expect(response.status).toBe(200);
    expect(response.data.shares).toHaveLength(2);

    // Should be ordered by createdAt desc (newest first)
    expect(response.data.shares[0]).toMatchObject({
      id: share2Response.data.id,
      token: share2Response.data.token,
      projectId,
      filePath: "src/file2.ts",
      url: expect.stringMatching(/\/share\/.+$/),
      accessedCount: 0,
    });

    expect(response.data.shares[1]).toMatchObject({
      id: share1Response.data.id,
      token: share1Response.data.token,
      projectId,
      filePath: "src/file1.ts",
      url: expect.stringMatching(/\/share\/.+$/),
      accessedCount: 0,
    });
  });

  it("should not return shares from other users", async () => {
    // Create project for current user using API
    const myProjectResponse = await apiCall(
      createProject,
      "POST",
      {},
      { name: "My Project" },
    );
    expect(myProjectResponse.status).toBe(201);
    const myProjectId = myProjectResponse.data.id;
    createdProjectIds.push(myProjectId);

    // Create share for current user
    const myShareResponse = await apiCall(
      createShare,
      "POST",
      {},
      { project_id: myProjectId, file_path: "my-file.ts" },
    );
    expect(myShareResponse.status).toBe(201);
    createdShareIds.push(myShareResponse.data.id);

    // Create project for other user using direct DB (needed for different user)
    initServices();
    const otherUserId = `other-user-shares-route-${Date.now()}-${process.pid}`;
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

    // Create shares for other user directly in DB
    const timestamp = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await globalThis.services.db.insert(SHARE_LINKS_TBL).values({
      id: `other-share-${timestamp}`,
      token: `other-token-${timestamp}`,
      projectId: otherProjectId,
      filePath: "other-file.ts",
      userId: otherUserId,
    });

    const response = await apiCall(GET, "GET");

    expect(response.status).toBe(200);

    // Filter to only the share we created in this test
    const ourShare = response.data.shares.find(
      (share: { id: string }) => share.id === myShareResponse.data.id,
    );

    // Should find our share
    expect(ourShare).toBeDefined();
    expect(ourShare.id).toBe(myShareResponse.data.id);

    // Should not see the other user's share
    const otherUserShare = response.data.shares.find(
      (share: { filePath: string }) => share.filePath === "other-file.ts",
    );
    expect(otherUserShare).toBeUndefined();

    // Clean up - delete shares first, then projects
    await globalThis.services.db
      .delete(SHARE_LINKS_TBL)
      .where(eq(SHARE_LINKS_TBL.userId, otherUserId));
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
    // Create a project using API
    const projectResponse = await apiCall(
      createProject,
      "POST",
      {},
      { name: "Test Project" },
    );
    expect(projectResponse.status).toBe(201);
    const projectId = projectResponse.data.id;
    createdProjectIds.push(projectId);

    // Create multiple shares with small delays to ensure different timestamps
    const share1Response = await apiCall(
      createShare,
      "POST",
      {},
      { project_id: projectId, file_path: "old.ts" },
    );
    expect(share1Response.status).toBe(201);
    createdShareIds.push(share1Response.data.id);

    // Small delay to ensure different timestamp
    await new Promise((resolve) => setTimeout(resolve, 10));

    const share2Response = await apiCall(
      createShare,
      "POST",
      {},
      { project_id: projectId, file_path: "middle.ts" },
    );
    expect(share2Response.status).toBe(201);
    createdShareIds.push(share2Response.data.id);

    // Small delay to ensure different timestamp
    await new Promise((resolve) => setTimeout(resolve, 10));

    const share3Response = await apiCall(
      createShare,
      "POST",
      {},
      { project_id: projectId, file_path: "new.ts" },
    );
    expect(share3Response.status).toBe(201);
    createdShareIds.push(share3Response.data.id);

    const response = await apiCall(GET, "GET");

    expect(response.status).toBe(200);

    // Filter to only the shares we created in this test
    const ourShares = response.data.shares.filter((share: { id: string }) =>
      createdShareIds.includes(share.id),
    );

    expect(ourShares).toHaveLength(3);
    // Should be ordered by createdAt desc (newest first)
    expect(ourShares[0].filePath).toBe("new.ts");
    expect(ourShares[1].filePath).toBe("middle.ts");
    expect(ourShares[2].filePath).toBe("old.ts");
  });
});
