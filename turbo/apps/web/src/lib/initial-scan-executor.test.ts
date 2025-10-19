import { describe, it, expect, beforeEach, vi } from "vitest";
import { InitialScanExecutor } from "./initial-scan-executor";
import { initServices } from "./init-services";
import { PROJECTS_TBL } from "../db/schema/projects";
import { SESSIONS_TBL, TURNS_TBL } from "../db/schema/sessions";
import { eq } from "drizzle-orm";
import { ClaudeExecutor } from "./claude-executor";
import { getInstallationToken } from "./github/auth";

// Mock ClaudeExecutor
vi.mock("./claude-executor", () => ({
  ClaudeExecutor: {
    execute: vi.fn(),
  },
}));

// Mock GitHub auth
vi.mock("./github/auth", () => ({
  getInstallationToken: vi.fn(),
}));

describe("InitialScanExecutor", () => {
  const testProjectId = `test-project-${Date.now()}-${process.pid}`;
  const testUserId = `test-user-${Date.now()}-${process.pid}`;
  const testInstallationId = 12345;
  const testSourceRepoUrl = "owner/repo";
  const testGithubToken = "ghs_test_token_123";

  beforeEach(async () => {
    vi.clearAllMocks();

    // Initialize real database connection
    initServices();
    const db = globalThis.services.db;

    // Clean up test data
    await db.delete(TURNS_TBL).where(eq(TURNS_TBL.sessionId, testProjectId));
    await db
      .delete(SESSIONS_TBL)
      .where(eq(SESSIONS_TBL.projectId, testProjectId));
    await db.delete(PROJECTS_TBL).where(eq(PROJECTS_TBL.id, testProjectId));

    // Mock GitHub token
    vi.mocked(getInstallationToken).mockResolvedValue(testGithubToken);

    // Mock ClaudeExecutor.execute to resolve immediately
    vi.mocked(ClaudeExecutor.execute).mockResolvedValue();
  });

  describe("startScan", () => {
    it("should create session and turn with scan prompt", async () => {
      // Create project first (required for foreign key constraint)
      const db = globalThis.services.db;
      await db.insert(PROJECTS_TBL).values({
        id: testProjectId,
        name: `Test Project ${Date.now()}`,
        userId: testUserId,
        ydocData: "test-data",
        version: 0,
      });

      const result = await InitialScanExecutor.startScan(
        testProjectId,
        testSourceRepoUrl,
        testUserId,
        testInstallationId,
      );

      expect(result).toMatchObject({
        sessionId: expect.stringMatching(/^sess_/),
        turnId: expect.stringMatching(/^turn_/),
      });

      // Verify session created
      const sessions = await db
        .select()
        .from(SESSIONS_TBL)
        .where(eq(SESSIONS_TBL.id, result.sessionId));

      expect(sessions).toHaveLength(1);
      expect(sessions[0]).toMatchObject({
        projectId: testProjectId,
        title: "Initial Repository Scan",
      });

      // Verify turn created
      const turns = await db
        .select()
        .from(TURNS_TBL)
        .where(eq(TURNS_TBL.id, result.turnId));

      expect(turns).toHaveLength(1);
      expect(turns[0]).toMatchObject({
        sessionId: result.sessionId,
        status: "pending",
      });
      expect(turns[0]?.userPrompt).toContain("owner/repo");
      expect(turns[0]?.userPrompt).toContain("~/workspace");
    });

    it("should update project status to running", async () => {
      // Create project first
      const db = globalThis.services.db;
      await db.insert(PROJECTS_TBL).values({
        id: testProjectId,
        name: `Test Project ${Date.now()}`,
        userId: testUserId,
        ydocData: "test-data",
        version: 0,
        sourceRepoUrl: testSourceRepoUrl,
        sourceRepoInstallationId: testInstallationId,
        initialScanStatus: "pending",
      });

      await InitialScanExecutor.startScan(
        testProjectId,
        testSourceRepoUrl,
        testUserId,
        testInstallationId,
      );

      // Verify project status updated
      const projects = await db
        .select()
        .from(PROJECTS_TBL)
        .where(eq(PROJECTS_TBL.id, testProjectId));

      expect(projects[0]).toMatchObject({
        initialScanStatus: "running",
        initialScanSessionId: expect.stringMatching(/^sess_/),
      });
    });

    it("should create session and turn for scan", async () => {
      // Create project first (required for foreign key constraint)
      const db = globalThis.services.db;
      await db.insert(PROJECTS_TBL).values({
        id: testProjectId,
        name: `Test Project ${Date.now()}`,
        userId: testUserId,
        ydocData: "test-data",
        version: 0,
      });

      const result = await InitialScanExecutor.startScan(
        testProjectId,
        testSourceRepoUrl,
        testUserId,
        testInstallationId,
      );

      // Verify session and turn were created
      expect(result).toMatchObject({
        sessionId: expect.stringMatching(/^sess_/),
        turnId: expect.stringMatching(/^turn_/),
      });

      // Verify project status was updated
      const [project] = await db
        .select()
        .from(PROJECTS_TBL)
        .where(eq(PROJECTS_TBL.id, testProjectId));

      expect(project?.initialScanStatus).toBe("running");
    });

    it("should throw error for invalid repository URL format", async () => {
      await expect(
        InitialScanExecutor.startScan(
          testProjectId,
          "invalid-url",
          testUserId,
          testInstallationId,
        ),
      ).rejects.toThrow("Invalid repository URL format");
    });

    it("should throw error when GitHub token retrieval fails", async () => {
      // Create project first
      const db = globalThis.services.db;
      await db.insert(PROJECTS_TBL).values({
        id: testProjectId,
        name: `Test Project ${Date.now()}`,
        userId: testUserId,
        ydocData: "test-data",
        version: 0,
      });

      // Mock token failure
      vi.mocked(getInstallationToken).mockRejectedValue(
        new Error("Invalid installation"),
      );

      await expect(
        InitialScanExecutor.startScan(
          testProjectId,
          testSourceRepoUrl,
          testUserId,
          testInstallationId,
        ),
      ).rejects.toThrow("Invalid installation");

      // Verify session was created (so sessionId exists for error recovery)
      const [project] = await db
        .select()
        .from(PROJECTS_TBL)
        .where(eq(PROJECTS_TBL.id, testProjectId));

      expect(project?.initialScanSessionId).toMatch(/^sess_/);
      expect(project?.initialScanStatus).toBe("running");
    });

    it("should work for public repos without installationId", async () => {
      // Create project first
      const db = globalThis.services.db;
      await db.insert(PROJECTS_TBL).values({
        id: testProjectId,
        name: `Test Project ${Date.now()}`,
        userId: testUserId,
        ydocData: "test-data",
        version: 0,
      });

      const result = await InitialScanExecutor.startScan(
        testProjectId,
        testSourceRepoUrl,
        testUserId,
        null, // No installation ID for public repos
      );

      expect(result).toMatchObject({
        sessionId: expect.stringMatching(/^sess_/),
        turnId: expect.stringMatching(/^turn_/),
      });

      // Verify ClaudeExecutor was called without GITHUB_TOKEN
      expect(ClaudeExecutor.execute).toHaveBeenCalledWith(
        result.turnId,
        result.sessionId,
        testProjectId,
        expect.any(String),
        testUserId,
        undefined, // No extra envs for public repos
      );

      // Verify getInstallationToken was NOT called
      expect(getInstallationToken).not.toHaveBeenCalled();
    });
  });

  describe("onScanComplete", () => {
    it("should update project status to completed on success", async () => {
      const db = globalThis.services.db;
      const sessionId = "sess_test_123";

      // Create project with initial scan
      await db.insert(PROJECTS_TBL).values({
        id: testProjectId,
        name: `Test Project ${Date.now()}`,
        userId: testUserId,
        ydocData: "test-data",
        version: 0,
        initialScanStatus: "running",
        initialScanSessionId: sessionId,
      });

      await InitialScanExecutor.onScanComplete(testProjectId, sessionId, true);

      // Verify status updated
      const projects = await db
        .select()
        .from(PROJECTS_TBL)
        .where(eq(PROJECTS_TBL.id, testProjectId));

      expect(projects[0]?.initialScanStatus).toBe("completed");
    });

    it("should update project status to failed on failure", async () => {
      const db = globalThis.services.db;
      const sessionId = "sess_test_123";

      // Create project with initial scan
      await db.insert(PROJECTS_TBL).values({
        id: testProjectId,
        name: `Test Project ${Date.now()}`,
        userId: testUserId,
        ydocData: "test-data",
        version: 0,
        initialScanStatus: "running",
        initialScanSessionId: sessionId,
      });

      await InitialScanExecutor.onScanComplete(testProjectId, sessionId, false);

      // Verify status updated
      const projects = await db
        .select()
        .from(PROJECTS_TBL)
        .where(eq(PROJECTS_TBL.id, testProjectId));

      expect(projects[0]?.initialScanStatus).toBe("failed");
    });

    it("should only update project with matching session ID", async () => {
      const db = globalThis.services.db;
      const sessionId1 = "sess_test_123";
      const sessionId2 = "sess_test_456";
      const projectId2 = "test-project-456";

      // Create two projects
      await db.insert(PROJECTS_TBL).values([
        {
          id: testProjectId,
          name: `Test Project 1 ${Date.now()}`,
          userId: testUserId,
          ydocData: "test-data-1",
          version: 0,
          initialScanStatus: "running",
          initialScanSessionId: sessionId1,
        },
        {
          id: projectId2,
          name: `Test Project 2 ${Date.now()}`,
          userId: testUserId,
          ydocData: "test-data-2",
          version: 0,
          initialScanStatus: "running",
          initialScanSessionId: sessionId2,
        },
      ]);

      // Update only first project
      await InitialScanExecutor.onScanComplete(testProjectId, sessionId1, true);

      // Verify only first project updated
      const project1 = await db
        .select()
        .from(PROJECTS_TBL)
        .where(eq(PROJECTS_TBL.id, testProjectId));
      const project2 = await db
        .select()
        .from(PROJECTS_TBL)
        .where(eq(PROJECTS_TBL.id, projectId2));

      expect(project1[0]?.initialScanStatus).toBe("completed");
      expect(project2[0]?.initialScanStatus).toBe("running");

      // Clean up
      await db.delete(PROJECTS_TBL).where(eq(PROJECTS_TBL.id, projectId2));
    });
  });

  describe("markScanFailed", () => {
    it("should mark scan as failed without requiring sessionId", async () => {
      const db = globalThis.services.db;

      // Create project without session (startup failure scenario)
      await db.insert(PROJECTS_TBL).values({
        id: testProjectId,
        name: `Test Project ${Date.now()}`,
        userId: testUserId,
        ydocData: "test-data",
        version: 0,
        initialScanStatus: "pending",
      });

      await InitialScanExecutor.markScanFailed(testProjectId);

      // Verify status updated
      const projects = await db
        .select()
        .from(PROJECTS_TBL)
        .where(eq(PROJECTS_TBL.id, testProjectId));

      expect(projects[0]?.initialScanStatus).toBe("failed");
    });
  });
});
