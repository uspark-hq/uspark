import { describe, it, expect, beforeEach, vi } from "vitest";
import "../../../../../src/test/setup";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { POST as createProject } from "../../route";
import { POST as createSession } from "../sessions/route";
import { POST as createTurn } from "../sessions/[sessionId]/turns/route";
import { POST as onClaudeStdout } from "../sessions/[sessionId]/turns/[turnId]/on-claude-stdout/route";
import { apiCall } from "../../../../../src/test/api-helpers";
import { initServices } from "../../../../../src/lib/init-services";
import { PROJECTS_TBL } from "../../../../../src/db/schema/projects";
import { SESSIONS_TBL } from "../../../../../src/db/schema/sessions";
import { eq } from "drizzle-orm";

// Mock Clerk authentication
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";

const mockAuth = vi.mocked(auth);

describe("/api/projects/[projectId]/initial-scan", () => {
  const userId = `test-user-initial-scan-${Date.now()}-${process.pid}`;
  const createdProjectIds: string[] = [];

  beforeEach(async () => {
    vi.clearAllMocks();
    // Mock successful authentication by default
    mockAuth.mockResolvedValue({ userId } as Awaited<ReturnType<typeof auth>>);
    createdProjectIds.length = 0;
  });

  describe("GET /api/projects/[projectId]/initial-scan", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockAuth.mockResolvedValue({ userId: null } as Awaited<
        ReturnType<typeof auth>
      >);

      const response = await GET(new NextRequest("http://localhost:3000"), {
        params: Promise.resolve({ projectId: "test-project-id" }),
      });

      const data = await response.json();
      expect(response.status).toBe(401);
      expect(data.error).toBe("unauthorized");
    });

    it("should return 404 when project does not exist", async () => {
      const response = await GET(new NextRequest("http://localhost:3000"), {
        params: Promise.resolve({ projectId: "non-existent-project" }),
      });

      const data = await response.json();
      expect(response.status).toBe(404);
      expect(data.error).toBe("project_not_found");
    });

    it("should return 401 when project belongs to another user", async () => {
      // Create project as different user
      const otherUserId = `other-user-${Date.now()}`;
      mockAuth.mockResolvedValue({
        userId: otherUserId,
      } as Awaited<ReturnType<typeof auth>>);

      const createResponse = await apiCall(
        createProject,
        "POST",
        {},
        { name: `Test Project ${Date.now()}` },
      );
      const projectId = createResponse.data.id;

      // Try to access as original user
      mockAuth.mockResolvedValue({ userId } as Awaited<
        ReturnType<typeof auth>
      >);

      const response = await GET(new NextRequest("http://localhost:3000"), {
        params: Promise.resolve({ projectId }),
      });

      const data = await response.json();
      expect(response.status).toBe(401);
      expect(data.error).toBe("unauthorized");
    });

    it("should return null values for project without initial scan", async () => {
      // Create project without scan
      const createResponse = await apiCall(
        createProject,
        "POST",
        {},
        { name: `Test Project ${Date.now()}` },
      );
      const projectId = createResponse.data.id;
      createdProjectIds.push(projectId);

      const response = await GET(new NextRequest("http://localhost:3000"), {
        params: Promise.resolve({ projectId }),
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.initial_scan_status).toBeNull();
      expect(data.initial_scan_progress).toBeNull();
      expect(data.initial_scan_turn_status).toBeNull();
    });

    it("should return initial scan progress with todos from TodoWrite blocks", async () => {
      initServices();
      const db = globalThis.services.db;

      // Create project
      const createProjectResponse = await apiCall(
        createProject,
        "POST",
        {},
        { name: `Test Project ${Date.now()}` },
      );
      const projectId = createProjectResponse.data.id;
      createdProjectIds.push(projectId);

      // Create session
      const sessionResponse = await createSession(
        new NextRequest("http://localhost:3000", {
          method: "POST",
          body: JSON.stringify({ title: "Initial Repository Scan" }),
        }),
        { params: Promise.resolve({ projectId }) },
      );
      const sessionData = await sessionResponse.json();
      const sessionId = sessionData.id;

      // Mark session as initial-scan
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

      // Create turn
      const turnResponse = await createTurn(
        new NextRequest("http://localhost:3000", {
          method: "POST",
          body: JSON.stringify({ user_message: "Scan repository" }),
        }),
        { params: Promise.resolve({ projectId, sessionId }) },
      );
      const turnData = await turnResponse.json();
      const turnId = turnData.id;

      // Create TodoWrite block
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
                ],
              },
            },
          ],
        },
      });

      await onClaudeStdout(
        new NextRequest("http://localhost:3000", {
          method: "POST",
          body: JSON.stringify({ line: todoWriteLine }),
        }),
        { params: Promise.resolve({ projectId, sessionId, turnId }) },
      );

      // Get initial scan data
      const response = await GET(new NextRequest("http://localhost:3000"), {
        params: Promise.resolve({ projectId }),
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.initial_scan_status).toBe("running");
      expect(data.initial_scan_progress).toBeDefined();
      expect(data.initial_scan_progress.todos).toHaveLength(2);
      expect(data.initial_scan_progress.todos[0]).toMatchObject({
        content: "Clone repository",
        status: "completed",
      });
      expect(data.initial_scan_turn_status).toBe("in_progress");
    });

    it("should return lastBlock when no TodoWrite blocks exist", async () => {
      initServices();
      const db = globalThis.services.db;

      // Create project
      const createProjectResponse = await apiCall(
        createProject,
        "POST",
        {},
        { name: `Test Project ${Date.now()}` },
      );
      const projectId = createProjectResponse.data.id;
      createdProjectIds.push(projectId);

      // Create session
      const sessionResponse = await createSession(
        new NextRequest("http://localhost:3000", {
          method: "POST",
          body: JSON.stringify({ title: "Initial Repository Scan" }),
        }),
        { params: Promise.resolve({ projectId }) },
      );
      const sessionData = await sessionResponse.json();
      const sessionId = sessionData.id;

      // Mark session as initial-scan
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

      // Create turn
      const turnResponse = await createTurn(
        new NextRequest("http://localhost:3000", {
          method: "POST",
          body: JSON.stringify({ user_message: "Scan repository" }),
        }),
        { params: Promise.resolve({ projectId, sessionId }) },
      );
      const turnData = await turnResponse.json();
      const turnId = turnData.id;

      // Create content block (not TodoWrite)
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

      // Get initial scan data
      const response = await GET(new NextRequest("http://localhost:3000"), {
        params: Promise.resolve({ projectId }),
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.initial_scan_progress).toBeDefined();
      expect(data.initial_scan_progress.lastBlock).toBeDefined();
      expect(data.initial_scan_progress.lastBlock.type).toBe("content");
      expect(data.initial_scan_progress.lastBlock.content).toMatchObject({
        text: "Analyzing repository structure...",
      });
    });

    it("should not fetch progress for completed scans", async () => {
      initServices();
      const db = globalThis.services.db;

      // Create project
      const createProjectResponse = await apiCall(
        createProject,
        "POST",
        {},
        { name: `Test Project ${Date.now()}` },
      );
      const projectId = createProjectResponse.data.id;
      createdProjectIds.push(projectId);

      // Create session
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

      // Get initial scan data
      const response = await GET(new NextRequest("http://localhost:3000"), {
        params: Promise.resolve({ projectId }),
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.initial_scan_status).toBe("completed");
      expect(data.initial_scan_progress).toBeNull();
    });
  });
});
