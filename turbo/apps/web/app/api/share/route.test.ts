import { describe, it, expect, beforeEach, vi } from "vitest";
import "../../../src/test/setup";
import { POST } from "./route";
import { POST as createProject } from "../projects/route";
import { apiCall } from "../../../src/test/api-helpers";
import { initServices } from "../../../src/lib/init-services";
import { PROJECTS_TBL } from "../../../src/db/schema/projects";
import { eq } from "drizzle-orm";
import * as Y from "yjs";

// Mock Clerk authentication
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
const mockAuth = vi.mocked(auth);

describe("/api/share", () => {
  const userId = `test-user-share-${Date.now()}-${process.pid}`;
  const testFilePath = "src/test.ts";
  let projectId: string;
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

  describe("POST /api/share", () => {
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
    });

    it("should create share link for valid request", async () => {
      const response = await apiCall(
        POST,
        "POST",
        {},
        {
          project_id: projectId,
          file_path: testFilePath,
        },
      );

      expect(response.status).toBe(201);
      expect(response.data).toMatchObject({
        id: expect.any(String),
        url: expect.stringMatching(/^https?:\/\/.+\/share\/.+/),
        token: expect.any(String),
      });

      createdShareIds.push(response.data.id);

      // Verify via GET /api/shares
      const { GET } = await import("../shares/route");
      const sharesResponse = await apiCall(GET, "GET");
      expect(sharesResponse.status).toBe(200);
      const createdShare = sharesResponse.data.shares.find(
        (s: any) => s.id === response.data.id,
      );
      expect(createdShare).toBeDefined();
      expect(createdShare.projectId).toBe(projectId);
      expect(createdShare.filePath).toBe(testFilePath);
    });

    it("should return 401 when user is not authenticated", async () => {
      mockAuth.mockResolvedValue({ userId: null } as Awaited<
        ReturnType<typeof auth>
      >);

      const response = await apiCall(
        POST,
        "POST",
        {},
        {
          project_id: projectId,
          file_path: testFilePath,
        },
      );

      expect(response.status).toBe(401);
      expect(response.data).toMatchObject({
        error: "unauthorized",
      });
    });

    it("should return 400 for missing project_id", async () => {
      const response = await apiCall(
        POST,
        "POST",
        {},
        {
          file_path: testFilePath,
        },
      );

      expect(response.status).toBe(400);
      expect(response.data).toMatchObject({
        error: "invalid_request",
        error_description: expect.stringContaining("project_id"),
      });
    });

    it("should return 400 for missing file_path", async () => {
      const response = await apiCall(
        POST,
        "POST",
        {},
        {
          project_id: projectId,
        },
      );

      expect(response.status).toBe(400);
      expect(response.data).toMatchObject({
        error: "invalid_request",
        error_description: expect.stringContaining("file_path"),
      });
    });

    it("should return 404 for non-existent project", async () => {
      const response = await apiCall(
        POST,
        "POST",
        {},
        {
          project_id: "non-existent-project",
          file_path: testFilePath,
        },
      );

      expect(response.status).toBe(404);
      expect(response.data).toMatchObject({
        error: "project_not_found",
      });
    });

    it("should return 404 for project owned by different user", async () => {
      // Create project owned by different user using direct DB (needed for different user)
      initServices();
      const otherUserId = "other-user";
      const otherProjectId = `other-project-${Date.now()}`;

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

      const response = await apiCall(
        POST,
        "POST",
        {},
        {
          project_id: otherProjectId,
          file_path: testFilePath,
        },
      );

      expect(response.status).toBe(404);
      expect(response.data).toMatchObject({
        error: "project_not_found",
      });

      // Clean up
      await globalThis.services.db
        .delete(PROJECTS_TBL)
        .where(eq(PROJECTS_TBL.id, otherProjectId));
    });
  });
});
