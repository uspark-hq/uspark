import { describe, it, expect, beforeEach, vi } from "vitest";
import "../../../../src/test/setup";
import { GET } from "./route";
import { POST as createProject } from "../../projects/route";
import { POST as createShare } from "../route";
import { apiCall } from "../../../../src/test/api-helpers";
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

describe("/api/share/:token", () => {
  const userId = `test-user-share-token-${Date.now()}-${process.pid}`;
  const testFilePath = "src/test.ts";
  let projectId: string;
  let shareToken: string;
  const createdProjectIds: string[] = [];
  const createdShareIds: string[] = [];

  beforeEach(async () => {
    vi.clearAllMocks();
    // Mock successful authentication
    mockAuth.mockResolvedValue({ userId } as Awaited<ReturnType<typeof auth>>);

    // Clear tracking arrays
    createdProjectIds.length = 0;
    createdShareIds.length = 0;
  });

  describe("GET /api/share/:token", () => {
    beforeEach(async () => {
      // Create a test project using API
      const projectResponse = await apiCall(
        createProject,
        "POST",
        {},
        { name: "Test Project" },
      );
      expect(projectResponse.status).toBe(201);
      projectId = projectResponse.data.id;
      createdProjectIds.push(projectId);

      // Create a share link using API
      const shareResponse = await apiCall(
        createShare,
        "POST",
        {},
        {
          project_id: projectId,
          file_path: testFilePath,
        },
      );
      expect(shareResponse.status).toBe(201);
      shareToken = shareResponse.data.token;
      createdShareIds.push(shareResponse.data.id);
    });

    it("should return 200 with hash-based metadata for valid share token", async () => {
      // Update project with file data in YDoc
      initServices();
      const ydoc = new Y.Doc();
      const files = ydoc.getMap("files");
      files.set(testFilePath, { hash: "abc123", mtime: Date.now() });
      const state = Y.encodeStateAsUpdate(ydoc);
      const base64Data = Buffer.from(state).toString("base64");

      await globalThis.services.db
        .update(PROJECTS_TBL)
        .set({ ydocData: base64Data })
        .where(eq(PROJECTS_TBL.id, projectId));

      const response = await apiCall(GET, "GET", { token: shareToken });

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        project_name: projectId,
        file_path: testFilePath,
        hash: "abc123",
        mtime: expect.any(Number),
      });
    });

    it("should return 404 for non-existent token", async () => {
      const invalidToken = "invalid-token-123";
      const response = await apiCall(GET, "GET", { token: invalidToken });

      expect(response.status).toBe(404);
      expect(response.data).toMatchObject({
        error: "share_not_found",
      });
    });

    it("should return 400 for missing token", async () => {
      const response = await apiCall(GET, "GET", { token: "" });

      expect(response.status).toBe(400);
      expect(response.data).toMatchObject({
        error: "share_not_found",
        error_description: "Invalid or missing token",
      });
    });

    // Note: Testing for deleted project scenarios is complex due to foreign key constraints.
    // In practice, the foreign key constraint prevents orphaned share links.

    it("should return 404 when file is not found in YDoc", async () => {
      // Create project without the shared file
      initServices();
      const ydoc = new Y.Doc();
      const files = ydoc.getMap("files");
      files.set("other-file.ts", { hash: "def456", mtime: Date.now() });

      const state = Y.encodeStateAsUpdate(ydoc);
      const base64Data = Buffer.from(state).toString("base64");

      await globalThis.services.db
        .update(PROJECTS_TBL)
        .set({ ydocData: base64Data })
        .where(eq(PROJECTS_TBL.id, projectId));

      const response = await apiCall(GET, "GET", { token: shareToken });

      expect(response.status).toBe(404);
      expect(response.data).toMatchObject({
        error: "file_not_found",
      });
    });

    it("should handle YDoc with invalid file node structure", async () => {
      // Create project with malformed file data
      initServices();
      const ydoc = new Y.Doc();
      const files = ydoc.getMap("files");
      files.set(testFilePath, "invalid-file-node"); // Should be object with hash/mtime

      const state = Y.encodeStateAsUpdate(ydoc);
      const base64Data = Buffer.from(state).toString("base64");

      await globalThis.services.db
        .update(PROJECTS_TBL)
        .set({ ydocData: base64Data })
        .where(eq(PROJECTS_TBL.id, projectId));

      const response = await apiCall(GET, "GET", { token: shareToken });

      expect(response.status).toBe(404);
      expect(response.data).toMatchObject({
        error: "file_not_found",
      });
    });

    it("should handle file node without hash", async () => {
      // Create project with file node missing hash
      initServices();
      const ydoc = new Y.Doc();
      const files = ydoc.getMap("files");
      files.set(testFilePath, { mtime: Date.now() }); // Missing hash

      const state = Y.encodeStateAsUpdate(ydoc);
      const base64Data = Buffer.from(state).toString("base64");

      await globalThis.services.db
        .update(PROJECTS_TBL)
        .set({ ydocData: base64Data })
        .where(eq(PROJECTS_TBL.id, projectId));

      const response = await apiCall(GET, "GET", { token: shareToken });

      expect(response.status).toBe(404);
      expect(response.data).toMatchObject({
        error: "file_not_found",
      });
    });
  });
});
