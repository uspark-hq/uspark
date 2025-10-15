import { describe, it, expect, beforeEach, vi } from "vitest";
import "../../../src/test/setup";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";
import { POST as createSession } from "./[projectId]/sessions/route";
import { POST as createTurn } from "./[projectId]/sessions/[sessionId]/turns/route";
import { POST as onClaudeStdout } from "./[projectId]/sessions/[sessionId]/turns/[turnId]/on-claude-stdout/route";
import { apiCall } from "../../../src/test/api-helpers";
import {
  createTestProjectForUser,
  cleanupTestProjects,
} from "../../../src/test/db-test-utils";
import { initServices } from "../../../src/lib/init-services";
import { PROJECTS_TBL } from "../../../src/db/schema/projects";
import { SESSIONS_TBL } from "../../../src/db/schema/sessions";
import { eq } from "drizzle-orm";

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

      // Create project via API
      const createProjectResponse = await apiCall(
        POST,
        "POST",
        {},
        { name: `Test Project ${Date.now()}` },
      );
      const projectId = createProjectResponse.data.id;
      createdProjectIds.push(projectId);

      // Create session via API
      const sessionResponse = await createSession(
        new NextRequest("http://localhost:3000", {
          method: "POST",
          body: JSON.stringify({ title: "Initial Repository Scan" }),
        }),
        { params: Promise.resolve({ projectId }) },
      );
      const sessionData = await sessionResponse.json();
      const sessionId = sessionData.id;

      // NOTE: Direct DB operation to mark session as initial-scan
      // Exception justified: session.type is an internal marker, not business logic.
      // No public API should allow setting this (security/integrity concern).
      // This is test setup for internal state, similar to CLI token in on-claude-stdout tests.
      await db
        .update(SESSIONS_TBL)
        .set({ type: "initial-scan" })
        .where(eq(SESSIONS_TBL.id, sessionId));

      // Update project to reference this scan session
      await db
        .update(PROJECTS_TBL)
        .set({
          sourceRepoUrl: "owner/repo",
          sourceRepoInstallationId: 12345,
          initialScanStatus: "running",
          initialScanSessionId: sessionId,
        })
        .where(eq(PROJECTS_TBL.id, projectId));

      // Create turn via API (send message)
      const turnResponse = await createTurn(
        new NextRequest("http://localhost:3000", {
          method: "POST",
          body: JSON.stringify({ user_message: "Scan repository" }),
        }),
        { params: Promise.resolve({ projectId, sessionId }) },
      );
      const turnData = await turnResponse.json();
      const turnId = turnData.id;

      // Create TodoWrite block via on-claude-stdout API
      const todoWriteLine = JSON.stringify({
        type: "assistant",
        message: {
          content: [
            {
              type: "tool_use",
              id: "tool_todowrite_123",
              name: "TodoWrite",
              input: {
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
          ],
        },
      });

      const onStdoutResponse = await onClaudeStdout(
        new NextRequest("http://localhost:3000", {
          method: "POST",
          body: JSON.stringify({ line: todoWriteLine }),
        }),
        { params: Promise.resolve({ projectId, sessionId, turnId }) },
      );
      expect(onStdoutResponse.status).toBe(200);

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

      // No explicit cleanup needed - project deletion cascades to sessions, turns, blocks
    });

    it("should return lastBlock when no TodoWrite blocks exist", async () => {
      initServices();
      const db = globalThis.services.db;

      // Create project via API
      const createProjectResponse = await apiCall(
        POST,
        "POST",
        {},
        { name: `Test Project ${Date.now()}` },
      );
      const projectId = createProjectResponse.data.id;
      createdProjectIds.push(projectId);

      // Create session via API
      const sessionResponse = await createSession(
        new NextRequest("http://localhost:3000", {
          method: "POST",
          body: JSON.stringify({ title: "Initial Repository Scan" }),
        }),
        { params: Promise.resolve({ projectId }) },
      );
      const sessionData = await sessionResponse.json();
      const sessionId = sessionData.id;

      // Mark session as initial-scan (internal marker)
      await db
        .update(SESSIONS_TBL)
        .set({ type: "initial-scan" })
        .where(eq(SESSIONS_TBL.id, sessionId));

      // Update project scan status
      await db
        .update(PROJECTS_TBL)
        .set({
          initialScanStatus: "running",
          initialScanSessionId: sessionId,
        })
        .where(eq(PROJECTS_TBL.id, projectId));

      // Create turn via API
      const turnResponse = await createTurn(
        new NextRequest("http://localhost:3000", {
          method: "POST",
          body: JSON.stringify({ user_message: "Scan repository" }),
        }),
        { params: Promise.resolve({ projectId, sessionId }) },
      );
      const turnData = await turnResponse.json();
      const turnId = turnData.id;

      // Create content block (not TodoWrite) via on-claude-stdout API
      const contentLine = JSON.stringify({
        type: "assistant",
        message: {
          content: [
            {
              type: "text",
              text: "Analyzing repository structure...",
            },
          ],
        },
      });

      await onClaudeStdout(
        new NextRequest("http://localhost:3000", {
          method: "POST",
          body: JSON.stringify({ line: contentLine }),
        }),
        { params: Promise.resolve({ projectId, sessionId, turnId }) },
      );

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
    });

    it("should not fetch progress for completed scans", async () => {
      initServices();
      const db = globalThis.services.db;

      // Create project via API
      const createProjectResponse = await apiCall(
        POST,
        "POST",
        {},
        { name: `Test Project ${Date.now()}` },
      );
      const projectId = createProjectResponse.data.id;
      createdProjectIds.push(projectId);

      // Create session via API
      const sessionResponse = await createSession(
        new NextRequest("http://localhost:3000", {
          method: "POST",
          body: JSON.stringify({ title: "Initial Repository Scan" }),
        }),
        { params: Promise.resolve({ projectId }) },
      );
      const sessionData = await sessionResponse.json();
      const sessionId = sessionData.id;

      // Update project to mark scan as completed
      await db
        .update(PROJECTS_TBL)
        .set({
          initialScanStatus: "completed",
          initialScanSessionId: sessionId,
        })
        .where(eq(PROJECTS_TBL.id, projectId));

      const response = await apiCall(GET, "GET");

      const project = response.data.projects.find(
        (p: { id: string }) => p.id === projectId,
      );

      expect(project).toBeDefined();
      expect(project.initial_scan_status).toBe("completed");
      expect(project.initial_scan_progress).toBeNull();
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
