import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";
import { initServices } from "../../../../src/lib/init-services";
import { SESSIONS_TBL, TURNS_TBL } from "../../../../src/db/schema/sessions";
import { PROJECTS_TBL } from "../../../../src/db/schema/projects";
import { eq } from "drizzle-orm";
import * as Y from "yjs";

// Mock Clerk authentication
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
const mockAuth = vi.mocked(auth);

describe("/api/claude/turns", () => {
  const uniqueId = `${Date.now()}-${process.pid}-${Math.random().toString(36).substring(7)}`;
  const userId = `test-user-turns-${uniqueId}`;
  let testProjectId: string;
  let testSessionId: string;

  afterEach(async () => {
    // Clean up test data after each test
    const db = globalThis.services.db;

    // Delete in reverse order to avoid foreign key constraints
    if (testSessionId) {
      await db.delete(TURNS_TBL).where(eq(TURNS_TBL.sessionId, testSessionId));
      await db.delete(SESSIONS_TBL).where(eq(SESSIONS_TBL.id, testSessionId));
    }
    if (testProjectId) {
      await db.delete(PROJECTS_TBL).where(eq(PROJECTS_TBL.id, testProjectId));
    }
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    // Mock successful authentication by default
    mockAuth.mockResolvedValue({ userId } as Awaited<ReturnType<typeof auth>>);

    // Initialize services
    initServices();
    const db = globalThis.services.db;

    // Clean up any existing test data
    await db.delete(PROJECTS_TBL).where(eq(PROJECTS_TBL.userId, userId));

    // Create a test project
    const ydoc = new Y.Doc();
    const ydocData = Buffer.from(Y.encodeStateAsUpdate(ydoc)).toString(
      "base64",
    );

    const projects = await db
      .insert(PROJECTS_TBL)
      .values({
        id: `test-${uniqueId}_${Date.now()}`,
        userId,
        ydocData,
        version: 0,
      })
      .returning();

    testProjectId = projects[0]!.id;

    // Create a test session
    const sessions = await db
      .insert(SESSIONS_TBL)
      .values({
        id: `sess_test_${uniqueId}_${Date.now()}`,
        projectId: testProjectId,
        title: "Test Session",
      })
      .returning();

    testSessionId = sessions[0]!.id;
  });

  describe("POST /api/claude/turns", () => {
    it("should create a new turn successfully", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/claude/turns",
        {
          method: "POST",
          body: JSON.stringify({
            sessionId: testSessionId,
            userPrompt: "Test user prompt",
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.id).toMatch(/^turn_/);
      expect(data.sessionId).toBe(testSessionId);
      expect(data.userPrompt).toBe("Test user prompt");
      expect(data.status).toBe("pending");
    });

    it("should update session's updatedAt timestamp", async () => {
      const db = globalThis.services.db;

      // Get original updatedAt
      const sessionBefore = await db
        .select()
        .from(SESSIONS_TBL)
        .where(eq(SESSIONS_TBL.id, testSessionId))
        .limit(1);
      const originalUpdatedAt = sessionBefore[0]!.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      const request = new NextRequest(
        "http://localhost:3000/api/claude/turns",
        {
          method: "POST",
          body: JSON.stringify({
            sessionId: testSessionId,
            userPrompt: "Test user prompt",
          }),
        },
      );

      await POST(request);

      // Check if updatedAt was updated
      const sessionAfter = await db
        .select()
        .from(SESSIONS_TBL)
        .where(eq(SESSIONS_TBL.id, testSessionId))
        .limit(1);

      expect(sessionAfter[0]!.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime(),
      );
    });

    it("should return 400 if sessionId is missing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/claude/turns",
        {
          method: "POST",
          body: JSON.stringify({
            userPrompt: "Test user prompt",
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("bad_request");
    });

    it("should return 400 if userPrompt is missing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/claude/turns",
        {
          method: "POST",
          body: JSON.stringify({
            sessionId: testSessionId,
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("bad_request");
    });

    it("should return 404 if session doesn't exist", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/claude/turns",
        {
          method: "POST",
          body: JSON.stringify({
            sessionId: "sess_nonexistent",
            userPrompt: "Test user prompt",
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("not_found");
    });

    it("should return 403 if user doesn't own the session's project", async () => {
      mockAuth.mockResolvedValueOnce({ userId: "different-user" } as Awaited<
        ReturnType<typeof auth>
      >);

      const request = new NextRequest(
        "http://localhost:3000/api/claude/turns",
        {
          method: "POST",
          body: JSON.stringify({
            sessionId: testSessionId,
            userPrompt: "Test user prompt",
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("forbidden");
    });

    it("should return 401 if not authenticated", async () => {
      mockAuth.mockResolvedValueOnce({ userId: null } as Awaited<
        ReturnType<typeof auth>
      >);

      const request = new NextRequest(
        "http://localhost:3000/api/claude/turns",
        {
          method: "POST",
          body: JSON.stringify({
            sessionId: testSessionId,
            userPrompt: "Test user prompt",
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("unauthorized");
    });
  });

  describe("GET /api/claude/turns", () => {
    beforeEach(async () => {
      // Ensure testSessionId is available
      if (!testSessionId) {
        throw new Error("testSessionId is not initialized");
      }

      // Create some test turns
      const db = globalThis.services.db;

      for (let i = 0; i < 3; i++) {
        await db.insert(TURNS_TBL).values({
          id: `turn_test_${uniqueId}_${i}_${Date.now()}`,
          sessionId: testSessionId,
          userPrompt: `Prompt ${i}`,
          status: i === 0 ? "completed" : i === 1 ? "running" : "pending",
        });
      }
    });

    it("should list all turns for a session", async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/claude/turns?sessionId=${testSessionId}`,
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.turns).toHaveLength(3);
      expect(data.turns[0]!.userPrompt).toMatch(/Prompt \d/);
      expect(
        data.turns.every(
          (t: { sessionId: string }) => t.sessionId === testSessionId,
        ),
      ).toBe(true);
    });

    it("should return turns in chronological order", async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/claude/turns?sessionId=${testSessionId}`,
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Turns should be ordered by createdAt (ascending)
      expect(data.turns[0]!.userPrompt).toBe("Prompt 0");
      expect(data.turns[1]!.userPrompt).toBe("Prompt 1");
      expect(data.turns[2]!.userPrompt).toBe("Prompt 2");
    });

    it("should return 400 if sessionId is missing", async () => {
      const request = new NextRequest("http://localhost:3000/api/claude/turns");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("bad_request");
    });

    it("should return 404 if session doesn't exist", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/claude/turns?sessionId=sess_nonexistent",
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("not_found");
    });

    it("should return 403 if user doesn't own the session's project", async () => {
      mockAuth.mockResolvedValueOnce({ userId: "different-user" } as Awaited<
        ReturnType<typeof auth>
      >);

      const request = new NextRequest(
        `http://localhost:3000/api/claude/turns?sessionId=${testSessionId}`,
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("forbidden");
    });

    it("should return 401 if not authenticated", async () => {
      mockAuth.mockResolvedValueOnce({ userId: null } as Awaited<
        ReturnType<typeof auth>
      >);

      const request = new NextRequest(
        `http://localhost:3000/api/claude/turns?sessionId=${testSessionId}`,
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("unauthorized");
    });
  });
});
