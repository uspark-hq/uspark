import { describe, it, expect, beforeEach, vi } from "vitest";
import "../../../src/test/setup";
import { GET, POST } from "./route";
import { apiCall } from "../../../src/test/api-helpers";
import {
  createTestProjectForUser,
  cleanupTestProjects,
} from "../../../src/test/db-test-utils";

// Mock Clerk authentication
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

// Mock GitHub repository functions
vi.mock("../../../src/lib/github/repository", () => ({
  hasInstallationAccess: vi.fn(),
}));

// Mock InitialScanExecutor
vi.mock("../../../src/lib/initial-scan-executor", () => ({
  InitialScanExecutor: {
    startScan: vi.fn(),
    onScanComplete: vi.fn(),
    markScanFailed: vi.fn(),
  },
}));

import { auth } from "@clerk/nextjs/server";
import { hasInstallationAccess } from "../../../src/lib/github/repository";
import { InitialScanExecutor } from "../../../src/lib/initial-scan-executor";

const mockAuth = vi.mocked(auth);
const mockHasInstallationAccess = vi.mocked(hasInstallationAccess);
const mockStartScan = vi.mocked(InitialScanExecutor.startScan);
const mockOnScanComplete = vi.mocked(InitialScanExecutor.onScanComplete);
const mockMarkScanFailed = vi.mocked(InitialScanExecutor.markScanFailed);

describe("/api/projects", () => {
  const userId = `test-user-projects-${Date.now()}-${process.pid}`;
  const createdProjectIds: string[] = [];

  beforeEach(async () => {
    vi.clearAllMocks();
    // Mock successful authentication by default
    mockAuth.mockResolvedValue({ userId } as Awaited<ReturnType<typeof auth>>);

    // Clean up any projects created in previous tests
    // Note: Since we don't have a DELETE endpoint yet, we'll track created projects
    // and rely on test isolation. In production tests, you'd want a proper cleanup API.
    createdProjectIds.length = 0;
  });

  describe("GET /api/projects", () => {
    it("should return empty list when user has no projects", async () => {
      const response = await apiCall(GET, "GET");

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("projects");
      expect(response.data.projects).toEqual([]);
    });

    it("should return user's projects list", async () => {
      // Create test projects using API endpoint
      const response1 = await apiCall(
        POST,
        "POST",
        {},
        { name: `test-project-1-${Date.now()}` },
      );
      expect(response1.status).toBe(201);
      const project1 = response1.data;
      createdProjectIds.push(project1.id);

      const response2 = await apiCall(
        POST,
        "POST",
        {},
        { name: `test-project-2-${Date.now()}` },
      );
      expect(response2.status).toBe(201);
      const project2 = response2.data;
      createdProjectIds.push(project2.id);

      const response = await apiCall(GET, "GET");

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("projects");
      expect(response.data.projects).toHaveLength(2);

      // Check project structure
      expect(response.data.projects[0]).toHaveProperty("id");
      expect(response.data.projects[0]).toHaveProperty("name");
      expect(response.data.projects[0]).toHaveProperty("created_at");
      expect(response.data.projects[0]).toHaveProperty("updated_at");

      // Check that we got our test projects
      const projectIds = response.data.projects.map(
        (p: { id: string }) => p.id,
      );
      expect(projectIds).toContain(project1.id);
      expect(projectIds).toContain(project2.id);
    });

    it("should only return projects for the correct user", async () => {
      // Create project for different user using utility function
      const otherUserId = "other-user";
      const otherProjectId = `other-project-${Date.now()}`;

      await createTestProjectForUser(otherUserId, {
        id: otherProjectId,
      });

      const response = await apiCall(GET, "GET");

      expect(response.status).toBe(200);

      // Should not contain the other user's project
      const projectIds = response.data.projects.map(
        (p: { id: string }) => p.id,
      );
      expect(projectIds).not.toContain(otherProjectId);

      // Should only contain projects created by the current user
      response.data.projects.forEach((project: { id: string }) => {
        // All projects should be from the current user (created in previous tests)
        // Project IDs should be valid UUIDs
        expect(
          createdProjectIds.includes(project.id) ||
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
              project.id,
            ),
        ).toBe(true);
      });

      // Clean up using utility function
      await cleanupTestProjects([otherProjectId]);
    });
  });

  describe("POST /api/projects", () => {
    it("should create a new project successfully", async () => {
      const projectName = `test-project-${Date.now()}`;

      const response = await apiCall(POST, "POST", {}, { name: projectName });

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty("id");
      expect(response.data).toHaveProperty("name");
      expect(response.data).toHaveProperty("created_at");
      expect(response.data.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      ); // UUID format
      expect(response.data.name).toBe(response.data.id); // Currently using ID as name

      createdProjectIds.push(response.data.id);

      // Verify project is accessible via GET
      const getResponse = await apiCall(GET, "GET");
      expect(getResponse.status).toBe(200);
      const projectIds = getResponse.data.projects.map(
        (p: { id: string }) => p.id,
      );
      expect(projectIds).toContain(response.data.id);
    });

    it("should generate unique project IDs", async () => {
      const projectName = "duplicate-name";

      // Create first project
      const response1 = await apiCall(POST, "POST", {}, { name: projectName });
      expect(response1.status).toBe(201);
      createdProjectIds.push(response1.data.id);

      // Create second project with same name
      const response2 = await apiCall(POST, "POST", {}, { name: projectName });
      expect(response2.status).toBe(201);
      createdProjectIds.push(response2.data.id);

      // IDs should be different even with same name
      expect(response1.data.id).not.toBe(response2.data.id);
      // Both should be valid UUIDs
      expect(response1.data.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(response2.data.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    it("should create project with source repository", async () => {
      const projectName = `test-project-with-repo-${Date.now()}`;
      const sourceRepoUrl = "owner/repo";
      const installationId = 12345;

      // Mock installation access
      mockHasInstallationAccess.mockResolvedValue(true);

      // Mock scan start
      mockStartScan.mockResolvedValue({
        sessionId: "sess_test_123",
        turnId: "turn_test_123",
      });

      const response = await apiCall(
        POST,
        "POST",
        {},
        {
          name: projectName,
          sourceRepoUrl,
          installationId,
        },
      );

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty("id");
      createdProjectIds.push(response.data.id);

      // Verify installation access was checked
      expect(mockHasInstallationAccess).toHaveBeenCalledWith(
        userId,
        installationId,
      );

      // Verify scan was started
      expect(mockStartScan).toHaveBeenCalledWith(
        response.data.id,
        sourceRepoUrl,
        installationId,
        userId,
      );
    });

    it("should reject project creation when user lacks installation access", async () => {
      const projectName = `test-project-no-access-${Date.now()}`;
      const sourceRepoUrl = "owner/repo";
      const installationId = 12345;

      // Mock no installation access
      mockHasInstallationAccess.mockResolvedValue(false);

      await apiCall(
        POST,
        "POST",
        {},
        {
          name: projectName,
          sourceRepoUrl,
          installationId,
        },
      );

      // Verify access was checked and scan was not started
      expect(mockHasInstallationAccess).toHaveBeenCalledWith(
        userId,
        installationId,
      );
      expect(mockStartScan).not.toHaveBeenCalled();
    });

    it("should create project without source repository", async () => {
      const projectName = `test-project-no-repo-${Date.now()}`;

      const response = await apiCall(POST, "POST", {}, { name: projectName });

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty("id");
      createdProjectIds.push(response.data.id);

      // Verify installation access was not checked
      expect(mockHasInstallationAccess).not.toHaveBeenCalled();

      // Verify scan was not started
      expect(mockStartScan).not.toHaveBeenCalled();
    });

    it("should validate source repo parameters", async () => {
      const projectName = `test-project-invalid-${Date.now()}`;

      // Missing installationId when sourceRepoUrl is provided
      await apiCall(
        POST,
        "POST",
        {},
        {
          name: projectName,
          sourceRepoUrl: "owner/repo",
        },
      );

      // Should not trigger installation check or scan when params incomplete
      expect(mockHasInstallationAccess).not.toHaveBeenCalled();
      expect(mockStartScan).not.toHaveBeenCalled();
    });

    it("should create project successfully even when scan startup fails", async () => {
      const projectName = `test-project-scan-fail-${Date.now()}`;
      const sourceRepoUrl = "owner/repo";
      const installationId = 12345;

      // Mock installation access
      mockHasInstallationAccess.mockResolvedValue(true);

      // Mock scan startup failure
      mockStartScan.mockRejectedValue(new Error("Scan startup failed"));

      // Mock error recovery methods
      mockMarkScanFailed.mockResolvedValue();

      const response = await apiCall(
        POST,
        "POST",
        {},
        {
          name: projectName,
          sourceRepoUrl,
          installationId,
        },
      );

      // Project should still be created successfully
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty("id");
      createdProjectIds.push(response.data.id);

      // Verify scan was attempted
      expect(mockStartScan).toHaveBeenCalledWith(
        response.data.id,
        sourceRepoUrl,
        installationId,
        userId,
      );

      // Verify error recovery was triggered
      // (Either markScanFailed or onScanComplete should be called)
      expect(
        mockMarkScanFailed.mock.calls.length +
          mockOnScanComplete.mock.calls.length,
      ).toBeGreaterThan(0);
    });
  });
});
