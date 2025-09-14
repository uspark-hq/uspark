import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, DELETE } from "./route";
import { initServices } from "../../../../../src/lib/init-services";
import {
  SESSIONS_TBL,
  TURNS_TBL,
  BLOCKS_TBL,
} from "../../../../../src/db/schema/sessions";
import { PROJECTS_TBL } from "../../../../../src/db/schema/projects";
import { eq } from "drizzle-orm";
import * as Y from "yjs";

// Mock Clerk authentication
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
const mockAuth = vi.mocked(auth);

describe("/api/claude/sessions/[sessionId]", () => {
  const uniqueId = `${Date.now()}-${process.pid}-${Math.random().toString(36).substring(7)}`;
  const userId = `test-user-session-detail-${uniqueId}`;
  let testProjectId: string;
  let testSessionId: string;
  let testTurnId: string;

  afterEach(async () => {
    // Clean up test data after each test
    const db = globalThis.services.db;

    // Delete in reverse order of creation to avoid foreign key constraints
    if (testTurnId) {
      await db.delete(BLOCKS_TBL).where(eq(BLOCKS_TBL.turnId, testTurnId));
      await db.delete(TURNS_TBL).where(eq(TURNS_TBL.id, testTurnId));
    }
    if (testSessionId) {
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
        id: `test-${Date.now()}`,
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

    // Create a test turn
    const turns = await db
      .insert(TURNS_TBL)
      .values({
        id: `turn_test_${uniqueId}_${Date.now()}`,
        sessionId: testSessionId,
        userPrompt: "Test prompt",
        status: "completed",
      })
      .returning();

    testTurnId = turns[0]!.id;

    // Create test blocks
    await db.insert(BLOCKS_TBL).values([
      {
        id: `block_test_${uniqueId}_1`,
        turnId: testTurnId,
        type: "content",
        content: { type: "content", content: { text: "Response 1" } },
        sequenceNumber: 1,
      },
      {
        id: `block_test_${uniqueId}_2`,
        turnId: testTurnId,
        type: "tool_use",
        content: {
          type: "tool_use",
          content: {
            tool_name: "test_tool",
            parameters: {},
            tool_use_id: "test_1",
          },
        },
        sequenceNumber: 2,
      },
    ]);
  });

  describe("GET /api/claude/sessions/[sessionId]", () => {
    it("should get session details with turns and blocks", async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/claude/sessions/${testSessionId}`,
      );

      const response = await GET(request, {
        params: Promise.resolve({ sessionId: testSessionId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(testSessionId);
      expect(data.projectId).toBe(testProjectId);
      expect(data.title).toBe("Test Session");
      expect(data.turns).toHaveLength(1);
      expect(data.turns[0]!.id).toBe(testTurnId);
      expect(data.turns[0]!.blocks).toHaveLength(2);
      expect(data.turns[0]!.blocks[0]!.type).toBe("content");
      expect(data.turns[0]!.blocks[1]!.type).toBe("tool_use");
    });

    it("should return 404 if session doesn't exist", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/claude/sessions/sess_nonexistent",
      );

      const response = await GET(request, {
        params: Promise.resolve({ sessionId: "sess_nonexistent" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("not_found");
    });

    it("should return 403 if user doesn't own the project", async () => {
      mockAuth.mockResolvedValueOnce({ userId: "different-user" } as Awaited<
        ReturnType<typeof auth>
      >);

      const request = new NextRequest(
        `http://localhost:3000/api/claude/sessions/${testSessionId}`,
      );

      const response = await GET(request, {
        params: Promise.resolve({ sessionId: testSessionId }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("forbidden");
    });

    it("should return 401 if not authenticated", async () => {
      mockAuth.mockResolvedValueOnce({ userId: null } as Awaited<
        ReturnType<typeof auth>
      >);

      const request = new NextRequest(
        `http://localhost:3000/api/claude/sessions/${testSessionId}`,
      );

      const response = await GET(request, {
        params: Promise.resolve({ sessionId: testSessionId }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("unauthorized");
    });
  });

  describe("DELETE /api/claude/sessions/[sessionId]", () => {
    it("should delete session and cascade delete turns and blocks", async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/claude/sessions/${testSessionId}`,
        { method: "DELETE" },
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ sessionId: testSessionId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify session is deleted
      const db = globalThis.services.db;
      const sessions = await db
        .select()
        .from(SESSIONS_TBL)
        .where(eq(SESSIONS_TBL.id, testSessionId));
      expect(sessions).toHaveLength(0);

      // Verify turns are cascade deleted
      const turns = await db
        .select()
        .from(TURNS_TBL)
        .where(eq(TURNS_TBL.sessionId, testSessionId));
      expect(turns).toHaveLength(0);

      // Verify blocks are cascade deleted
      const blocks = await db
        .select()
        .from(BLOCKS_TBL)
        .where(eq(BLOCKS_TBL.turnId, testTurnId));
      expect(blocks).toHaveLength(0);
    });

    it("should return 404 if session doesn't exist", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/claude/sessions/sess_nonexistent",
        { method: "DELETE" },
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ sessionId: "sess_nonexistent" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("not_found");
    });

    it("should return 403 if user doesn't own the project", async () => {
      mockAuth.mockResolvedValueOnce({ userId: "different-user" } as Awaited<
        ReturnType<typeof auth>
      >);

      const request = new NextRequest(
        `http://localhost:3000/api/claude/sessions/${testSessionId}`,
        { method: "DELETE" },
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ sessionId: testSessionId }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("forbidden");
    });

    it("should return 401 if not authenticated", async () => {
      mockAuth.mockResolvedValueOnce({ userId: null } as Awaited<
        ReturnType<typeof auth>
      >);

      const request = new NextRequest(
        `http://localhost:3000/api/claude/sessions/${testSessionId}`,
        { method: "DELETE" },
      );

      const response = await DELETE(request, {
        params: Promise.resolve({ sessionId: testSessionId }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("unauthorized");
    });
  });
});
