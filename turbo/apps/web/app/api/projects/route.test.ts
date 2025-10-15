import { describe, it, expect, beforeEach, vi } from "vitest";
import "../../../src/test/setup";
import { GET, POST } from "./route";
import { apiCall } from "../../../src/test/api-helpers";
import {
  createTestProjectForUser,
  cleanupTestProjects,
} from "../../../src/test/db-test-utils";
import { initServices } from "../../../src/lib/init-services";
import { PROJECTS_TBL } from "../../../src/db/schema/projects";
import {
  SESSIONS_TBL,
  TURNS_TBL,
  BLOCKS_TBL,
} from "../../../src/db/schema/sessions";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

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
      const project1 = response1.data;
      createdProjectIds.push(project1.id);

      const response2 = await apiCall(
        POST,
        "POST",
        {},
        { name: `test-project-2-${Date.now()}` },
      );
      const project2 = response2.data;
      createdProjectIds.push(project2.id);

      const response = await apiCall(GET, "GET");

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

      expect(response.data).toHaveProperty("id");
      expect(response.data).toHaveProperty("name");
      expect(response.data).toHaveProperty("created_at");
      expect(response.data.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      ); // UUID format
      expect(response.data.name).toBe(projectName); // Should return the provided name

      createdProjectIds.push(response.data.id);

      // Verify project is accessible via GET
      const getResponse = await apiCall(GET, "GET");
      const projectIds = getResponse.data.projects.map(
        (p: { id: string }) => p.id,
      );
      expect(projectIds).toContain(response.data.id);
    });

    it("should generate unique project IDs", async () => {
      const timestamp = Date.now();

      // Create first project
      const response1 = await apiCall(
        POST,
        "POST",
        {},
        { name: `project-1-${timestamp}` },
      );
      createdProjectIds.push(response1.data.id);

      // Create second project with different name
      const response2 = await apiCall(
        POST,
        "POST",
        {},
        { name: `project-2-${timestamp}` },
      );
      createdProjectIds.push(response2.data.id);

      // IDs should be different
      expect(response1.data.id).not.toBe(response2.data.id);
      // Both should be valid UUIDs
      expect(response1.data.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(response2.data.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    it("should reject duplicate project names for the same user", async () => {
      const projectName = `duplicate-test-${Date.now()}`;

      // Create first project
      const response1 = await apiCall(POST, "POST", {}, { name: projectName });
      createdProjectIds.push(response1.data.id);
      expect(response1.data.name).toBe(projectName);

      // Attempt to create second project with same name
      const response2 = await apiCall(POST, "POST", {}, { name: projectName });

      // Should return error for duplicate name
      expect(response2.data).toHaveProperty("error", "duplicate_project_name");
      expect(response2.data).toHaveProperty("error_description");
      expect(response2.data.error_description).toContain(projectName);
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

      expect(response.data).toHaveProperty("id");
      createdProjectIds.push(response.data.id);
    });

    it("should reject project creation when user lacks installation access", async () => {
      const projectName = `test-project-no-access-${Date.now()}`;
      const sourceRepoUrl = "owner/repo";
      const installationId = 12345;

      // Mock no installation access
      mockHasInstallationAccess.mockResolvedValue(false);

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

      // Verify access was denied
      expect(response.data).toHaveProperty("error", "forbidden");
    });

    it("should create project without source repository", async () => {
      const projectName = `test-project-no-repo-${Date.now()}`;

      const response = await apiCall(POST, "POST", {}, { name: projectName });

      expect(response.data).toHaveProperty("id");
      createdProjectIds.push(response.data.id);
    });

    it("should validate source repo parameters", async () => {
      const projectName = `test-project-invalid-${Date.now()}`;

      // Missing installationId when sourceRepoUrl is provided
      const response = await apiCall(
        POST,
        "POST",
        {},
        {
          name: projectName,
          sourceRepoUrl: "owner/repo",
        },
      );

      // Project should be created without scan
      expect(response.data).toHaveProperty("id");
    });
  });

  describe("GET /api/projects with initial scan progress", () => {
    it("should return initial_scan_progress with todos from TodoWrite blocks", async () => {
      initServices();
      const db = globalThis.services.db;

      // Create project with scan status
      const projectId = randomUUID();
      const sessionId = `sess_${randomUUID()}`;
      const turnId = `turn_${randomUUID()}`;

      await db.insert(PROJECTS_TBL).values({
        id: projectId,
        userId,
        name: `Test Project ${Date.now()}`,
        ydocData: "test-data",
        version: 0,
        sourceRepoUrl: "owner/repo",
        sourceRepoInstallationId: 12345,
        initialScanStatus: "running",
        initialScanSessionId: sessionId,
      });

      // Create session with type 'initial-scan'
      await db.insert(SESSIONS_TBL).values({
        id: sessionId,
        projectId,
        title: "Initial Repository Scan",
        type: "initial-scan",
      });

      // Create turn
      await db.insert(TURNS_TBL).values({
        id: turnId,
        sessionId,
        userPrompt: "Scan repository",
        status: "running",
      });

      // Create TodoWrite block
      await db.insert(BLOCKS_TBL).values({
        id: `block_${randomUUID()}`,
        turnId,
        type: "tool_use",
        content: {
          tool_name: "TodoWrite",
          parameters: {
            todos: [
              {
                content: "Clone repository",
                status: "completed",
                activeForm: "Cloning repository",
              },
              {
                content: "Analyze codebase",
                status: "in_progress",
                activeForm: "Analyzing codebase",
              },
              {
                content: "Generate summary",
                status: "pending",
                activeForm: "Generating summary",
              },
            ],
          },
        },
        sequenceNumber: 0,
      });

      const response = await apiCall(GET, "GET");

      const project = response.data.projects.find(
        (p: { id: string }) => p.id === projectId,
      );

      expect(project).toBeDefined();
      expect(project.initial_scan_status).toBe("running");
      expect(project.initial_scan_progress).toBeDefined();
      expect(project.initial_scan_progress.todos).toHaveLength(3);
      expect(project.initial_scan_progress.todos[0]).toMatchObject({
        content: "Clone repository",
        status: "completed",
      });
      expect(project.initial_scan_progress.todos[1]).toMatchObject({
        content: "Analyze codebase",
        status: "in_progress",
      });

      // Cleanup
      await db.delete(BLOCKS_TBL).where(eq(BLOCKS_TBL.turnId, turnId));
      await db.delete(TURNS_TBL).where(eq(TURNS_TBL.id, turnId));
      await db.delete(SESSIONS_TBL).where(eq(SESSIONS_TBL.id, sessionId));
      await db.delete(PROJECTS_TBL).where(eq(PROJECTS_TBL.id, projectId));
    });

    it("should return lastBlock when no TodoWrite blocks exist", async () => {
      initServices();
      const db = globalThis.services.db;

      const projectId = randomUUID();
      const sessionId = `sess_${randomUUID()}`;
      const turnId = `turn_${randomUUID()}`;

      await db.insert(PROJECTS_TBL).values({
        id: projectId,
        userId,
        name: `Test Project ${Date.now()}`,
        ydocData: "test-data",
        version: 0,
        initialScanStatus: "running",
        initialScanSessionId: sessionId,
      });

      await db.insert(SESSIONS_TBL).values({
        id: sessionId,
        projectId,
        title: "Initial Repository Scan",
        type: "initial-scan",
      });

      await db.insert(TURNS_TBL).values({
        id: turnId,
        sessionId,
        userPrompt: "Scan repository",
        status: "running",
      });

      // Create content block without TodoWrite
      await db.insert(BLOCKS_TBL).values({
        id: `block_${randomUUID()}`,
        turnId,
        type: "content",
        content: {
          text: "Analyzing repository structure...",
        },
        sequenceNumber: 0,
      });

      const response = await apiCall(GET, "GET");

      const project = response.data.projects.find(
        (p: { id: string }) => p.id === projectId,
      );

      expect(project).toBeDefined();
      expect(project.initial_scan_progress).toBeDefined();
      expect(project.initial_scan_progress.lastBlock).toBeDefined();
      expect(project.initial_scan_progress.lastBlock.type).toBe("content");
      expect(project.initial_scan_progress.lastBlock.content).toMatchObject({
        text: "Analyzing repository structure...",
      });

      // Cleanup
      await db.delete(BLOCKS_TBL).where(eq(BLOCKS_TBL.turnId, turnId));
      await db.delete(TURNS_TBL).where(eq(TURNS_TBL.id, turnId));
      await db.delete(SESSIONS_TBL).where(eq(SESSIONS_TBL.id, sessionId));
      await db.delete(PROJECTS_TBL).where(eq(PROJECTS_TBL.id, projectId));
    });

    it("should not fetch progress for completed scans", async () => {
      initServices();
      const db = globalThis.services.db;

      const projectId = randomUUID();
      const sessionId = `sess_${randomUUID()}`;

      await db.insert(PROJECTS_TBL).values({
        id: projectId,
        userId,
        name: `Test Project ${Date.now()}`,
        ydocData: "test-data",
        version: 0,
        initialScanStatus: "completed",
        initialScanSessionId: sessionId,
      });

      const response = await apiCall(GET, "GET");

      const project = response.data.projects.find(
        (p: { id: string }) => p.id === projectId,
      );

      expect(project).toBeDefined();
      expect(project.initial_scan_status).toBe("completed");
      expect(project.initial_scan_progress).toBeNull();

      // Cleanup
      await db.delete(PROJECTS_TBL).where(eq(PROJECTS_TBL.id, projectId));
    });

    it("should handle projects without initial scan", async () => {
      const projectName = `test-project-no-scan-${Date.now()}`;

      const createResponse = await apiCall(
        POST,
        "POST",
        {},
        { name: projectName },
      );
      createdProjectIds.push(createResponse.data.id);

      const response = await apiCall(GET, "GET");

      const project = response.data.projects.find(
        (p: { id: string }) => p.id === createResponse.data.id,
      );

      expect(project).toBeDefined();
      expect(project.initial_scan_status).toBeNull();
      expect(project.initial_scan_progress).toBeNull();
    });
  });
});
