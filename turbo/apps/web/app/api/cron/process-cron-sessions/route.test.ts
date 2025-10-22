import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import "../../../../src/test/setup";
import { POST } from "./route";
import { POST as createProject } from "../../projects/route";
import { apiCall } from "../../../../src/test/api-helpers";
import { initServices } from "../../../../src/lib/init-services";
import { PROJECTS_TBL } from "../../../../src/db/schema/projects";
import { SESSIONS_TBL, TURNS_TBL } from "../../../../src/db/schema/sessions";
import { eq, and } from "drizzle-orm";
import * as Y from "yjs";
import { NextRequest } from "next/server";

// Mock Clerk authentication
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

// Mock ClaudeExecutor to prevent actual Claude execution
vi.mock("../../../../src/lib/claude-executor", () => ({
  ClaudeExecutor: {
    execute: vi.fn().mockResolvedValue(undefined),
  },
}));

import { auth } from "@clerk/nextjs/server";
import { ClaudeExecutor } from "../../../../src/lib/claude-executor";

const mockAuth = vi.mocked(auth);
const mockClaudeExecute = vi.mocked(ClaudeExecutor.execute);

describe("/api/cron/process-cron-sessions", () => {
  const userId = `test-user-cron-${Date.now()}-${process.pid}`;
  const createdProjectIds: string[] = [];
  const cronSecret = "test-cron-secret-key";

  // Store blob content for mocking fetch
  const blobContentStore = new Map<string, string>();

  // Store original env
  const originalCronSecret = process.env.CRON_SECRET;
  const originalBlobToken = process.env.BLOB_READ_WRITE_TOKEN;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId } as Awaited<ReturnType<typeof auth>>);

    // Set CRON_SECRET for tests
    process.env.CRON_SECRET = cronSecret;

    // Set BLOB_READ_WRITE_TOKEN for tests (format: vercel_blob_rw_STOREID_...)
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_test-store-id_extra";

    // Clear blob content store
    blobContentStore.clear();

    // Mock global fetch to intercept blob storage requests
    global.fetch = vi.fn((url: string | URL | Request) => {
      const urlString =
        typeof url === "string"
          ? url
          : url instanceof URL
            ? url.toString()
            : url.url;

      // Check if this is a blob storage URL
      if (urlString.includes("blob.vercel-storage.com")) {
        // Extract hash from URL: https://test-store-id.public.blob.vercel-storage.com/projects/{projectId}/{hash}
        const hashMatch = urlString.match(/\/projects\/[^/]+\/(.+)$/);
        if (hashMatch && hashMatch[1]) {
          const hash = hashMatch[1];
          const content = blobContentStore.get(hash);

          if (content !== undefined) {
            return Promise.resolve({
              ok: true,
              status: 200,
              statusText: "OK",
              text: () => Promise.resolve(content),
            } as Response);
          }
        }

        // Blob not found
        return Promise.resolve({
          ok: false,
          status: 404,
          statusText: "Not Found",
          text: () => Promise.resolve("Blob not found"),
        } as Response);
      }

      // Not a blob storage URL, return error
      return Promise.resolve({
        ok: false,
        status: 404,
        statusText: "Not Found",
        text: () => Promise.resolve("Not found"),
      } as Response);
    }) as unknown as typeof fetch;

    // Clean up any previous test projects for this user to avoid YJS parsing errors
    initServices();
    const db = globalThis.services.db;

    // First delete sessions (which will cascade to turns and blocks)
    const oldProjects = await db
      .select({ id: PROJECTS_TBL.id })
      .from(PROJECTS_TBL)
      .where(eq(PROJECTS_TBL.userId, userId));

    for (const project of oldProjects) {
      await db
        .delete(SESSIONS_TBL)
        .where(eq(SESSIONS_TBL.projectId, project.id));
    }

    // Then delete projects
    await db.delete(PROJECTS_TBL).where(eq(PROJECTS_TBL.userId, userId));

    // Clear created projects
    createdProjectIds.length = 0;
  });

  afterEach(async () => {
    // Cleanup: delete created projects (cascades to sessions and turns)
    if (createdProjectIds.length > 0) {
      initServices();
      const db = globalThis.services.db;

      for (const projectId of createdProjectIds) {
        // First delete sessions (which cascades to turns and blocks)
        await db
          .delete(SESSIONS_TBL)
          .where(eq(SESSIONS_TBL.projectId, projectId));
        // Then delete project
        await db.delete(PROJECTS_TBL).where(eq(PROJECTS_TBL.id, projectId));
      }
    }

    // Restore original env
    process.env.CRON_SECRET = originalCronSecret;
    process.env.BLOB_READ_WRITE_TOKEN = originalBlobToken;

    // Restore global fetch
    vi.restoreAllMocks();
  });

  /**
   * Helper to create a project with YJS data containing cron.md
   */
  async function createProjectWithCronMd(
    cronMdContent: string,
  ): Promise<string> {
    // Create project
    const projectResponse = await apiCall(
      createProject,
      "POST",
      {},
      { name: `Test Project with cron.md ${Date.now()}` },
    );
    expect(projectResponse.status).toBe(201);
    const projectId = projectResponse.data.id;
    createdProjectIds.push(projectId);

    // Create YJS document with cron.md
    const ydoc = new Y.Doc();
    const filesMap = ydoc.getMap("files");
    const blobsMap = ydoc.getMap("blobs");

    // Add cron.md file
    const cronFileHash = "cron-md-hash-" + Date.now();
    filesMap.set("cron.md", {
      hash: cronFileHash,
      mtime: Date.now(),
    });

    // Store blob metadata only (content is in blob storage)
    blobsMap.set(cronFileHash, {
      size: cronMdContent.length,
    });

    // Store content in mock blob storage
    blobContentStore.set(cronFileHash, cronMdContent);

    // Update project with YJS data
    initServices();
    const db = globalThis.services.db;
    const yjsData = Y.encodeStateAsUpdate(ydoc);
    const base64Data = Buffer.from(yjsData).toString("base64");

    await db
      .update(PROJECTS_TBL)
      .set({ ydocData: base64Data })
      .where(eq(PROJECTS_TBL.id, projectId));

    return projectId;
  }

  /**
   * Helper to create a project without cron.md
   */
  async function createProjectWithoutCronMd(): Promise<string> {
    const projectResponse = await apiCall(
      createProject,
      "POST",
      {},
      { name: `Test Project without cron.md ${Date.now()}` },
    );
    expect(projectResponse.status).toBe(201);
    const projectId = projectResponse.data.id;
    createdProjectIds.push(projectId);

    // Create YJS document WITHOUT cron.md
    const ydoc = new Y.Doc();
    const filesMap = ydoc.getMap("files");
    const blobsMap = ydoc.getMap("blobs");

    // Add some other file (README.md)
    const readmeHash = "readme-hash-" + Date.now();
    filesMap.set("README.md", {
      hash: readmeHash,
      mtime: Date.now(),
    });
    blobsMap.set(readmeHash, {
      size: 15,
    });

    // Store README content in mock blob storage
    blobContentStore.set(readmeHash, "# Test Project");

    // Update project with YJS data
    initServices();
    const db = globalThis.services.db;
    const yjsData = Y.encodeStateAsUpdate(ydoc);
    const base64Data = Buffer.from(yjsData).toString("base64");

    await db
      .update(PROJECTS_TBL)
      .set({ ydocData: base64Data })
      .where(eq(PROJECTS_TBL.id, projectId));

    return projectId;
  }

  /**
   * Helper to make cron API call with auth header
   */
  async function callCronApi(authHeader?: string) {
    const headers: Record<string, string> = {};
    if (authHeader !== undefined) {
      headers["authorization"] = authHeader;
    }

    const url = new URL("http://localhost:3000/api/cron/process-cron-sessions");
    const request = new NextRequest(url, {
      method: "POST",
      headers,
    });

    // Call the handler directly
    const response = await POST(request);

    if (response.headers.get("content-type")?.includes("application/json")) {
      return {
        status: response.status,
        data: await response.json(),
      };
    }

    return {
      status: response.status,
      data: null,
    };
  }

  describe("Authentication", () => {
    it("should reject requests without CRON_SECRET header", async () => {
      const response = await callCronApi();

      expect(response.status).toBe(401);
      expect(response.data.error).toBe("Unauthorized");
    });

    it("should reject requests with invalid CRON_SECRET", async () => {
      const response = await callCronApi("Bearer wrong-secret");

      expect(response.status).toBe(401);
      expect(response.data.error).toBe("Unauthorized");
    });

    it("should return error if CRON_SECRET env is not configured", async () => {
      delete process.env.CRON_SECRET;

      const response = await callCronApi("Bearer any-value");

      expect(response.status).toBe(500);
      expect(response.data.error).toBe("CRON_SECRET not configured");
    });

    it("should accept requests with valid CRON_SECRET", async () => {
      const response = await callCronApi(`Bearer ${cronSecret}`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });
  });

  describe("Project processing", () => {
    it("should handle projects with invalid YJS data", async () => {
      // Create project and then set invalid ydocData
      const projectResponse = await apiCall(
        createProject,
        "POST",
        {},
        { name: `Test Project Invalid YJS ${Date.now()}-${Math.random()}` },
      );
      expect(projectResponse.status).toBe(201);
      const projectId = projectResponse.data.id;
      createdProjectIds.push(projectId);

      // Set invalid base64 YJS data that will fail to parse
      initServices();
      const db = globalThis.services.db;
      await db
        .update(PROJECTS_TBL)
        .set({ ydocData: "invalid-yjs-data-not-base64" })
        .where(eq(PROJECTS_TBL.id, projectId));

      const response = await callCronApi(`Bearer ${cronSecret}`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.processedProjects).toBeGreaterThanOrEqual(1);

      // Should have an error for this project (YJS parsing error)
      const error = response.data.errors.find(
        (e: { projectId: string; error: string }) => e.projectId === projectId,
      );
      expect(error).toBeDefined();
      expect(error?.error).toBeTruthy(); // Any error message is fine
    });

    it("should skip projects without cron.md file", async () => {
      const projectId = await createProjectWithoutCronMd();

      const response = await callCronApi(`Bearer ${cronSecret}`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);

      const skipped = response.data.skippedProjects.find(
        (s: { projectId: string; reason: string }) => s.projectId === projectId,
      );
      expect(skipped).toBeDefined();
      expect(skipped?.reason).toBe("cron.md not found");
    });

    it("should skip projects with empty cron.md", async () => {
      const projectId = await createProjectWithCronMd("");

      const response = await callCronApi(`Bearer ${cronSecret}`);

      expect(response.status).toBe(200);

      const skipped = response.data.skippedProjects.find(
        (s: { projectId: string; reason: string }) => s.projectId === projectId,
      );
      expect(skipped).toBeDefined();
      expect(skipped?.reason).toBe("cron.md is empty");
    });

    it("should skip projects with whitespace-only cron.md", async () => {
      const projectId = await createProjectWithCronMd("   \n  \t  ");

      const response = await callCronApi(`Bearer ${cronSecret}`);

      expect(response.status).toBe(200);

      const skipped = response.data.skippedProjects.find(
        (s: { projectId: string; reason: string }) => s.projectId === projectId,
      );
      expect(skipped).toBeDefined();
      expect(skipped?.reason).toBe("cron.md is empty");
    });
  });

  describe("Cron session creation", () => {
    it("should create cron session and turn for project with cron.md", async () => {
      const cronPrompt = "Check project status and run tests";
      const projectId = await createProjectWithCronMd(cronPrompt);

      const response = await callCronApi(`Bearer ${cronSecret}`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.upsertedSessions).toBeGreaterThanOrEqual(1);
      expect(response.data.createdTurns).toBeGreaterThanOrEqual(1);

      // Verify cron session was created
      initServices();
      const db = globalThis.services.db;

      const sessions = await db
        .select()
        .from(SESSIONS_TBL)
        .where(
          and(
            eq(SESSIONS_TBL.projectId, projectId),
            eq(SESSIONS_TBL.type, "cron"),
          ),
        );

      expect(sessions).toHaveLength(1);
      expect(sessions[0]!.title).toBe("Cron Session");
      expect(sessions[0]!.type).toBe("cron");

      // Verify turn was created
      const turns = await db
        .select()
        .from(TURNS_TBL)
        .where(eq(TURNS_TBL.sessionId, sessions[0]!.id));

      expect(turns).toHaveLength(1);
      expect(turns[0]!.userPrompt).toBe(cronPrompt);
      expect(turns[0]!.status).toBe("running");

      // Verify ClaudeExecutor was called
      expect(mockClaudeExecute).toHaveBeenCalledWith(
        turns[0]!.id,
        sessions[0]!.id,
        projectId,
        cronPrompt,
        userId,
      );
    });

    it("should reuse existing cron session on subsequent runs", async () => {
      const cronPrompt = "Monitoring task";
      const projectId = await createProjectWithCronMd(cronPrompt);

      // First run: creates session and turn
      const response1 = await callCronApi(`Bearer ${cronSecret}`);
      expect(response1.status).toBe(200);
      expect(response1.data.upsertedSessions).toBeGreaterThanOrEqual(1);
      expect(response1.data.createdTurns).toBeGreaterThanOrEqual(1);

      // Get the created session
      initServices();
      const db = globalThis.services.db;

      const sessions1 = await db
        .select()
        .from(SESSIONS_TBL)
        .where(
          and(
            eq(SESSIONS_TBL.projectId, projectId),
            eq(SESSIONS_TBL.type, "cron"),
          ),
        );
      expect(sessions1).toHaveLength(1);
      const sessionId = sessions1[0]!.id;

      // Mark the first turn as completed
      const turns1 = await db
        .select()
        .from(TURNS_TBL)
        .where(eq(TURNS_TBL.sessionId, sessionId));

      await db
        .update(TURNS_TBL)
        .set({ status: "completed", completedAt: new Date() })
        .where(eq(TURNS_TBL.id, turns1[0]!.id));

      // Second run: should reuse session
      const response2 = await callCronApi(`Bearer ${cronSecret}`);
      expect(response2.status).toBe(200);
      expect(response2.data.createdTurns).toBeGreaterThanOrEqual(1);

      // Verify same session is used
      const sessions2 = await db
        .select()
        .from(SESSIONS_TBL)
        .where(
          and(
            eq(SESSIONS_TBL.projectId, projectId),
            eq(SESSIONS_TBL.type, "cron"),
          ),
        );
      expect(sessions2).toHaveLength(1); // Still only one session
      expect(sessions2[0]!.id).toBe(sessionId); // Same session ID

      // Verify second turn was created
      const turns2 = await db
        .select()
        .from(TURNS_TBL)
        .where(eq(TURNS_TBL.sessionId, sessionId));
      expect(turns2).toHaveLength(2); // Now two turns
    });

    it("should skip if last turn is still running", async () => {
      const cronPrompt = "Long running task";
      const projectId = await createProjectWithCronMd(cronPrompt);

      // First run: creates session and turn
      const response1 = await callCronApi(`Bearer ${cronSecret}`);
      expect(response1.status).toBe(200);
      expect(response1.data.createdTurns).toBeGreaterThanOrEqual(1);

      // Second run: should skip because turn is still running
      const response2 = await callCronApi(`Bearer ${cronSecret}`);
      expect(response2.status).toBe(200);

      const skipped = response2.data.skippedProjects.find(
        (s: { projectId: string; reason: string }) => s.projectId === projectId,
      );
      expect(skipped).toBeDefined();
      expect(skipped?.reason).toBe("Last turn still running");

      // Verify no new turn was created
      initServices();
      const db = globalThis.services.db;

      const sessions = await db
        .select()
        .from(SESSIONS_TBL)
        .where(
          and(
            eq(SESSIONS_TBL.projectId, projectId),
            eq(SESSIONS_TBL.type, "cron"),
          ),
        );

      const turns = await db
        .select()
        .from(TURNS_TBL)
        .where(eq(TURNS_TBL.sessionId, sessions[0]!.id));

      expect(turns).toHaveLength(1); // Still only one turn
    });
  });

  describe("Batch processing", () => {
    it("should process multiple projects in batch", async () => {
      // Create 3 projects with cron.md
      const project1 = await createProjectWithCronMd("Task 1");
      const project2 = await createProjectWithCronMd("Task 2");
      const project3 = await createProjectWithCronMd("Task 3");

      const response = await callCronApi(`Bearer ${cronSecret}`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.processedProjects).toBeGreaterThanOrEqual(3);
      expect(response.data.upsertedSessions).toBeGreaterThanOrEqual(3);
      expect(response.data.createdTurns).toBeGreaterThanOrEqual(3);

      // Verify all 3 projects have cron sessions
      initServices();
      const db = globalThis.services.db;

      for (const projectId of [project1, project2, project3]) {
        const sessions = await db
          .select()
          .from(SESSIONS_TBL)
          .where(
            and(
              eq(SESSIONS_TBL.projectId, projectId),
              eq(SESSIONS_TBL.type, "cron"),
            ),
          );
        expect(sessions).toHaveLength(1);
      }
    });

    it("should handle mixed scenarios correctly", async () => {
      // Create different types of projects
      await createProjectWithCronMd("Valid task");
      await createProjectWithoutCronMd();
      await createProjectWithCronMd("");

      const response = await callCronApi(`Bearer ${cronSecret}`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);

      // Should create session only for project with valid cron.md
      expect(response.data.upsertedSessions).toBeGreaterThanOrEqual(1);
      expect(response.data.createdTurns).toBeGreaterThanOrEqual(1);

      // Should skip the other two
      expect(response.data.skippedProjects.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Error handling", () => {
    it("should continue processing other projects if one fails", async () => {
      await createProjectWithCronMd("Valid task");

      // Create a project with invalid YJS data
      const projectResponse = await apiCall(
        createProject,
        "POST",
        {},
        { name: `Corrupted Project ${Date.now()}` },
      );
      expect(projectResponse.status).toBe(201);
      const corruptedProjectId = projectResponse.data.id;
      createdProjectIds.push(corruptedProjectId);

      // Set invalid YJS data
      initServices();
      const db = globalThis.services.db;
      await db
        .update(PROJECTS_TBL)
        .set({ ydocData: "invalid-base64-data-that-will-fail" })
        .where(eq(PROJECTS_TBL.id, corruptedProjectId));

      const response = await callCronApi(`Bearer ${cronSecret}`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);

      // Should have at least one error
      expect(response.data.errors.length).toBeGreaterThanOrEqual(1);

      // But should still process valid projects
      expect(response.data.createdTurns).toBeGreaterThanOrEqual(1);
    });
  });
});
