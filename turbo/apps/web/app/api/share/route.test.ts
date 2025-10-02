import { describe, it, expect, beforeEach, vi } from "vitest";
import "../../../src/test/setup";
import { POST } from "./route";
import { POST as createProject } from "../projects/route";
import { apiCall } from "../../../src/test/api-helpers";

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
        (s: { id: string }) => s.id === response.data.id,
      );
      expect(createdShare).toBeDefined();
      expect(createdShare.projectId).toBe(projectId);
      expect(createdShare.filePath).toBe(testFilePath);
    });
  });
});
