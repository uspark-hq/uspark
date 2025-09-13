import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, PATCH } from "./route";
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

describe("/api/claude/turns/[turnId]", () => {
  const uniqueId = `${Date.now()}-${process.pid}-${Math.random().toString(36).substring(7)}`;
  const userId = `test-user-turn-detail-${uniqueId}`;
  let testProjectId: string;
  let testSessionId: string;
  let testTurnId: string;

  afterEach(async () => {
    // Clean up test data after each test
    const db = globalThis.services.db;

    // Delete in reverse order to avoid foreign key constraints
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
        id: `proj_test_${Date.now()}`,
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
        id: `sess_test_${Date.now()}`,
        projectId: testProjectId,
        title: "Test Session",
      })
      .returning();

    testSessionId = sessions[0]!.id;

    // Create a test turn
    const turns = await db
      .insert(TURNS_TBL)
      .values({
        id: `turn_test_${Date.now()}`,
        sessionId: testSessionId,
        userPrompt: "Test prompt",
        status: "pending",
      })
      .returning();

    testTurnId = turns[0]!.id;
  });

  describe("GET /api/claude/turns/[turnId]", () => {
    beforeEach(async () => {
      // Create test blocks
      const db = globalThis.services.db;
      await db.insert(BLOCKS_TBL).values([
        {
          id: `block_test_1`,
          turnId: testTurnId,
          type: "thinking",
          content: { type: "thinking", content: { text: "Thinking..." } },
          sequenceNumber: 1,
        },
        {
          id: `block_test_2`,
          turnId: testTurnId,
          type: "content",
          content: { type: "content", content: { text: "Response text" } },
          sequenceNumber: 2,
        },
        {
          id: `block_test_3`,
          turnId: testTurnId,
          type: "tool_result",
          content: {
            type: "tool_result",
            content: {
              tool_use_id: "test_1",
              result: "Tool output",
            },
          },
          sequenceNumber: 3,
        },
      ]);
    });

    it("should get turn details with all blocks", async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/claude/turns/${testTurnId}`,
      );

      const response = await GET(request, {
        params: Promise.resolve({ turnId: testTurnId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(testTurnId);
      expect(data.sessionId).toBe(testSessionId);
      expect(data.userPrompt).toBe("Test prompt");
      expect(data.status).toBe("pending");
      expect(data.blocks).toHaveLength(3);
      expect(data.blocks[0]!.type).toBe("thinking");
      expect(data.blocks[1]!.type).toBe("content");
      expect(data.blocks[2]!.type).toBe("tool_result");
      // Verify blocks are ordered by sequence number
      expect(data.blocks[0]!.sequenceNumber).toBe(1);
      expect(data.blocks[1]!.sequenceNumber).toBe(2);
      expect(data.blocks[2]!.sequenceNumber).toBe(3);
    });

    it("should return empty blocks array if no blocks exist", async () => {
      // Delete all blocks
      const db = globalThis.services.db;
      await db.delete(BLOCKS_TBL).where(eq(BLOCKS_TBL.turnId, testTurnId));

      const request = new NextRequest(
        `http://localhost:3000/api/claude/turns/${testTurnId}`,
      );

      const response = await GET(request, {
        params: Promise.resolve({ turnId: testTurnId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.blocks).toHaveLength(0);
    });

    it("should return 404 if turn doesn't exist", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/claude/turns/turn_nonexistent",
      );

      const response = await GET(request, {
        params: Promise.resolve({ turnId: "turn_nonexistent" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("not_found");
    });

    it("should return 403 if user doesn't own the project", async () => {
      mockAuth.mockResolvedValueOnce({ userId: "different-user" } as Awaited<ReturnType<typeof auth>>);

      const request = new NextRequest(
        `http://localhost:3000/api/claude/turns/${testTurnId}`,
      );

      const response = await GET(request, {
        params: Promise.resolve({ turnId: testTurnId }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("forbidden");
    });

    it("should return 401 if not authenticated", async () => {
      mockAuth.mockResolvedValueOnce({ userId: null } as Awaited<ReturnType<typeof auth>>);

      const request = new NextRequest(
        `http://localhost:3000/api/claude/turns/${testTurnId}`,
      );

      const response = await GET(request, {
        params: Promise.resolve({ turnId: testTurnId }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("unauthorized");
    });
  });

  describe("PATCH /api/claude/turns/[turnId]", () => {
    it("should update turn status to running", async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/claude/turns/${testTurnId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: "running",
          }),
        },
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ turnId: testTurnId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe("running");
      expect(data.startedAt).toBeDefined();
      expect(data.completedAt).toBeNull();
    });

    it("should update turn status to completed", async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/claude/turns/${testTurnId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: "completed",
          }),
        },
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ turnId: testTurnId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe("completed");
      expect(data.completedAt).toBeDefined();
    });

    it("should update turn status to failed with error message", async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/claude/turns/${testTurnId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: "failed",
            errorMessage: "Test error",
          }),
        },
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ turnId: testTurnId }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe("failed");
      expect(data.completedAt).toBeDefined();
      expect(data.errorMessage).toBe("Test error");
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
        `http://localhost:3000/api/claude/turns/${testTurnId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: "completed",
          }),
        },
      );

      await PATCH(request, {
        params: Promise.resolve({ turnId: testTurnId }),
      });

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

    it("should return 400 if status is missing", async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/claude/turns/${testTurnId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            errorMessage: "Test error",
          }),
        },
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ turnId: testTurnId }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("bad_request");
    });

    it("should return 404 if turn doesn't exist", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/claude/turns/turn_nonexistent",
        {
          method: "PATCH",
          body: JSON.stringify({
            status: "completed",
          }),
        },
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ turnId: "turn_nonexistent" }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("not_found");
    });

    it("should return 403 if user doesn't own the project", async () => {
      mockAuth.mockResolvedValueOnce({ userId: "different-user" } as Awaited<ReturnType<typeof auth>>);

      const request = new NextRequest(
        `http://localhost:3000/api/claude/turns/${testTurnId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: "completed",
          }),
        },
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ turnId: testTurnId }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("forbidden");
    });

    it("should return 401 if not authenticated", async () => {
      mockAuth.mockResolvedValueOnce({ userId: null } as Awaited<ReturnType<typeof auth>>);

      const request = new NextRequest(
        `http://localhost:3000/api/claude/turns/${testTurnId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: "completed",
          }),
        },
      );

      const response = await PATCH(request, {
        params: Promise.resolve({ turnId: testTurnId }),
      });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("unauthorized");
    });
  });
});
