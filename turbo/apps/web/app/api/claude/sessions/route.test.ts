import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";
import { initServices } from "../../../../src/lib/init-services";
import { SESSIONS_TBL } from "../../../../src/db/schema/sessions";
import { PROJECTS_TBL } from "../../../../src/db/schema/projects";
import { eq } from "drizzle-orm";
import * as Y from "yjs";

// Mock Clerk authentication
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
const mockAuth = vi.mocked(auth);

describe("/api/claude/sessions", () => {
  const uniqueId = `${Date.now()}-${process.pid}-${Math.random().toString(36).substring(7)}`;
  const userId = `test-user-sessions-${uniqueId}`;
  let testProjectId: string;

  afterEach(async () => {
    // Clean up test data after each test
    const db = globalThis.services.db;

    // Delete sessions first to avoid foreign key constraint
    if (testProjectId) {
      await db
        .delete(SESSIONS_TBL)
        .where(eq(SESSIONS_TBL.projectId, testProjectId));
    }

    // Then delete projects
    await db.delete(PROJECTS_TBL).where(eq(PROJECTS_TBL.userId, userId));
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    // Mock successful authentication by default
    mockAuth.mockResolvedValue({ userId } as Awaited<ReturnType<typeof auth>>);

    // Initialize services
    initServices();
    const db = globalThis.services.db;

    // Clean up any existing test data
    // Note: Can't delete sessions by projectId yet since it doesn't exist
    // Just delete all projects for this test user (cascade will handle sessions)
    await db.delete(PROJECTS_TBL).where(eq(PROJECTS_TBL.userId, userId));

    // Create a test project
    const ydoc = new Y.Doc();
    const ydocData = Buffer.from(Y.encodeStateAsUpdate(ydoc)).toString(
      "base64",
    );

    const projects = await db
      .insert(PROJECTS_TBL)
      .values({
        id: `proj_test_${Date.now()}`,
        userId,
        ydocData,
        version: 0,
      })
      .returning();

    testProjectId = projects[0]!.id;
  });

  describe("POST /api/claude/sessions", () => {
    it("should create a new session successfully", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/claude/sessions",
        {
          method: "POST",
          body: JSON.stringify({
            projectId: testProjectId,
            title: "Test Session",
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.id).toMatch(/^sess_/);
      expect(data.projectId).toBe(testProjectId);
      expect(data.title).toBe("Test Session");
    });

    it("should use default title if not provided", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/claude/sessions",
        {
          method: "POST",
          body: JSON.stringify({
            projectId: testProjectId,
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.title).toBe("New Session");
    });

    it("should return 400 if projectId is missing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/claude/sessions",
        {
          method: "POST",
          body: JSON.stringify({
            title: "Test Session",
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("bad_request");
    });

    it("should return 404 if project doesn't exist", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/claude/sessions",
        {
          method: "POST",
          body: JSON.stringify({
            projectId: "proj_nonexistent",
            title: "Test Session",
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("not_found");
    });

    it("should return 401 if not authenticated", async () => {
      mockAuth.mockResolvedValueOnce({ userId: null } as Awaited<ReturnType<typeof auth>>);

      const request = new NextRequest(
        "http://localhost:3000/api/claude/sessions",
        {
          method: "POST",
          body: JSON.stringify({
            projectId: testProjectId,
            title: "Test Session",
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("unauthorized");
    });

    it("should return 404 if user doesn't own the project", async () => {
      mockAuth.mockResolvedValueOnce({ userId: "different-user" } as Awaited<ReturnType<typeof auth>>);

      const request = new NextRequest(
        "http://localhost:3000/api/claude/sessions",
        {
          method: "POST",
          body: JSON.stringify({
            projectId: testProjectId,
            title: "Test Session",
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("not_found");
    });
  });

  describe("GET /api/claude/sessions", () => {
    beforeEach(async () => {
      // Create some test sessions
      const db = globalThis.services.db;

      for (let i = 0; i < 3; i++) {
        await db.insert(SESSIONS_TBL).values({
          id: `sess_test_${uniqueId}_${i}`,
          projectId: testProjectId,
          title: `Session ${i}`,
        });
      }
    });

    it("should list all sessions for user's projects", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/claude/sessions",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sessions).toHaveLength(3);
      expect(data.sessions[0]!.title).toMatch(/Session \d/);
      expect(data.limit).toBe(20);
      expect(data.offset).toBe(0);
    });

    it("should filter sessions by projectId", async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/claude/sessions?projectId=${testProjectId}`,
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sessions).toHaveLength(3);
      expect(
        data.sessions.every((s: { projectId: string }) => s.projectId === testProjectId),
      ).toBe(true);
    });

    it("should support pagination", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/claude/sessions?limit=2&offset=1",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sessions).toHaveLength(2);
      expect(data.limit).toBe(2);
      expect(data.offset).toBe(1);
    });

    it("should return empty array if no sessions exist", async () => {
      // Delete all sessions
      const db = globalThis.services.db;
      await db
        .delete(SESSIONS_TBL)
        .where(eq(SESSIONS_TBL.projectId, testProjectId));

      const request = new NextRequest(
        "http://localhost:3000/api/claude/sessions",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sessions).toHaveLength(0);
    });

    it("should return 401 if not authenticated", async () => {
      mockAuth.mockResolvedValueOnce({ userId: null } as Awaited<ReturnType<typeof auth>>);

      const request = new NextRequest(
        "http://localhost:3000/api/claude/sessions",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("unauthorized");
    });
  });
});
