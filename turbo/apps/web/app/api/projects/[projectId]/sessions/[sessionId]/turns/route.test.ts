import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";
import { initServices } from "../../../../../../../src/lib/init-services";
import { PROJECTS_TBL } from "../../../../../../../src/db/schema/projects";
import {
  SESSIONS_TBL,
  TURNS_TBL,
  BLOCKS_TBL,
} from "../../../../../../../src/db/schema/sessions";
import { eq } from "drizzle-orm";
import * as Y from "yjs";

// Mock Clerk authentication
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
const mockAuth = vi.mocked(auth);

describe("/api/projects/:projectId/sessions/:sessionId/turns", () => {
  const projectId = `proj_turns_${Date.now()}`;
  const sessionId = `sess_turns_${Date.now()}`;
  const userId = "test-user-turns";
  let createdTurnIds: string[] = [];
  let createdBlockIds: string[] = [];

  beforeEach(async () => {
    // Mock successful authentication by default
    mockAuth.mockResolvedValue({ userId } as Awaited<ReturnType<typeof auth>>);

    // Initialize services
    initServices();

    // Clean up any existing test data
    await globalThis.services.db
      .delete(PROJECTS_TBL)
      .where(eq(PROJECTS_TBL.id, projectId));

    // Create test project
    const ydoc = new Y.Doc();
    const state = Y.encodeStateAsUpdate(ydoc);
    const base64Data = Buffer.from(state).toString("base64");

    await globalThis.services.db.insert(PROJECTS_TBL).values({
      id: projectId,
      userId,
      ydocData: base64Data,
      version: 0,
    });

    // Create test session
    await globalThis.services.db.insert(SESSIONS_TBL).values({
      id: sessionId,
      projectId,
      title: "Test Session for Turns",
    });

    createdTurnIds = [];
    createdBlockIds = [];
  });

  afterEach(async () => {
    // Clean up blocks
    for (const blockId of createdBlockIds) {
      await globalThis.services.db
        .delete(BLOCKS_TBL)
        .where(eq(BLOCKS_TBL.id, blockId));
    }

    // Clean up turns
    for (const turnId of createdTurnIds) {
      await globalThis.services.db
        .delete(TURNS_TBL)
        .where(eq(TURNS_TBL.id, turnId));
    }

    // Clean up session
    await globalThis.services.db
      .delete(SESSIONS_TBL)
      .where(eq(SESSIONS_TBL.id, sessionId));

    // Clean up project
    await globalThis.services.db
      .delete(PROJECTS_TBL)
      .where(eq(PROJECTS_TBL.id, projectId));
  });

  describe("POST /api/projects/:projectId/sessions/:sessionId/turns", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValueOnce({ userId: null } as Awaited<
        ReturnType<typeof auth>
      >);

      const request = new NextRequest("http://localhost:3000", {
        method: "POST",
        body: JSON.stringify({ user_message: "Hello" }),
      });
      const context = { params: Promise.resolve({ projectId, sessionId }) };

      const response = await POST(request, context);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty("error", "unauthorized");
    });

    it("should return 404 when project doesn't exist", async () => {
      const request = new NextRequest("http://localhost:3000", {
        method: "POST",
        body: JSON.stringify({ user_message: "Hello" }),
      });
      const context = {
        params: Promise.resolve({
          projectId: "non-existent",
          sessionId,
        }),
      };

      const response = await POST(request, context);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data).toHaveProperty("error", "project_not_found");
    });

    it("should return 404 when session doesn't exist", async () => {
      const request = new NextRequest("http://localhost:3000", {
        method: "POST",
        body: JSON.stringify({ user_message: "Hello" }),
      });
      const context = {
        params: Promise.resolve({
          projectId,
          sessionId: "non-existent",
        }),
      };

      const response = await POST(request, context);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data).toHaveProperty("error", "session_not_found");
    });

    it("should return 400 when user_message is missing", async () => {
      const request = new NextRequest("http://localhost:3000", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const context = { params: Promise.resolve({ projectId, sessionId }) };

      const response = await POST(request, context);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty("error", "user_message_required");
    });

    it("should create a new turn with pending status", async () => {
      const userMessage = "What is the weather today?";
      const request = new NextRequest("http://localhost:3000", {
        method: "POST",
        body: JSON.stringify({ user_message: userMessage }),
      });
      const context = { params: Promise.resolve({ projectId, sessionId }) };

      const response = await POST(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("id");
      expect(data.id).toMatch(/^turn_/);
      expect(data).toHaveProperty("session_id", sessionId);
      expect(data).toHaveProperty("user_message", userMessage);
      expect(data).toHaveProperty("status", "pending");
      expect(data).toHaveProperty("created_at");

      createdTurnIds.push(data.id);

      // Verify in database
      const [turn] = await globalThis.services.db
        .select()
        .from(TURNS_TBL)
        .where(eq(TURNS_TBL.id, data.id));

      expect(turn).toBeDefined();
      expect(turn.sessionId).toBe(sessionId);
      expect(turn.userPrompt).toBe(userMessage);
      expect(turn.status).toBe("pending");
      expect(turn.startedAt).toBeNull();
      expect(turn.completedAt).toBeNull();
    });
  });

  describe("GET /api/projects/:projectId/sessions/:sessionId/turns", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValueOnce({ userId: null } as Awaited<
        ReturnType<typeof auth>
      >);

      const request = new NextRequest("http://localhost:3000");
      const context = { params: Promise.resolve({ projectId, sessionId }) };

      const response = await GET(request, context);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty("error", "unauthorized");
    });

    it("should return empty list when no turns exist", async () => {
      const request = new NextRequest("http://localhost:3000");
      const context = { params: Promise.resolve({ projectId, sessionId }) };

      const response = await GET(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("turns");
      expect(data).toHaveProperty("total");
      expect(data.turns).toEqual([]);
      expect(data.total).toBe(0);
    });

    it("should return turns with block counts", async () => {
      // Create turns
      const [turn1] = await globalThis.services.db
        .insert(TURNS_TBL)
        .values({
          id: `turn_test1_${Date.now()}`,
          sessionId,
          userPrompt: "First question",
          status: "completed",
          startedAt: new Date(),
          completedAt: new Date(),
        })
        .returning();

      const [turn2] = await globalThis.services.db
        .insert(TURNS_TBL)
        .values({
          id: `turn_test2_${Date.now()}`,
          sessionId,
          userPrompt: "Second question",
          status: "running",
          startedAt: new Date(),
        })
        .returning();

      createdTurnIds.push(turn1.id, turn2.id);

      // Add blocks to turn1
      const [block1] = await globalThis.services.db
        .insert(BLOCKS_TBL)
        .values({
          id: `block_1_${Date.now()}`,
          turnId: turn1.id,
          type: "thinking",
          content: JSON.stringify({ text: "Thinking..." }),
          sequenceNumber: 0,
        })
        .returning();

      const [block2] = await globalThis.services.db
        .insert(BLOCKS_TBL)
        .values({
          id: `block_2_${Date.now()}`,
          turnId: turn1.id,
          type: "content",
          content: JSON.stringify({ text: "The answer is..." }),
          sequenceNumber: 1,
        })
        .returning();

      createdBlockIds.push(block1.id, block2.id);

      const request = new NextRequest("http://localhost:3000");
      const context = { params: Promise.resolve({ projectId, sessionId }) };

      const response = await GET(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.turns).toHaveLength(2);
      expect(data.total).toBeGreaterThanOrEqual(2);

      // Check first turn has blocks
      const firstTurn = data.turns.find(
        (t: { id: string }) => t.id === turn1.id,
      );
      expect(firstTurn).toBeDefined();
      expect(firstTurn.block_count).toBe(2);
      expect(firstTurn.block_ids).toHaveLength(2);
      expect(firstTurn.block_ids).toContain(block1.id);
      expect(firstTurn.block_ids).toContain(block2.id);

      // Check second turn has no blocks
      const secondTurn = data.turns.find(
        (t: { id: string }) => t.id === turn2.id,
      );
      expect(secondTurn).toBeDefined();
      expect(secondTurn.block_count).toBe(0);
      expect(secondTurn.block_ids).toEqual([]);
    });

    it("should support pagination", async () => {
      // Create 5 turns
      const turnIds = [];
      for (let i = 0; i < 5; i++) {
        const [turn] = await globalThis.services.db
          .insert(TURNS_TBL)
          .values({
            id: `turn_page_${i}_${Date.now()}`,
            sessionId,
            userPrompt: `Question ${i}`,
            status: "completed",
          })
          .returning();
        turnIds.push(turn.id);
        createdTurnIds.push(turn.id);
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // Test limit
      const request1 = new NextRequest("http://localhost:3000?limit=2");
      const context = { params: Promise.resolve({ projectId, sessionId }) };
      const response1 = await GET(request1, context);
      const data1 = await response1.json();
      expect(data1.turns).toHaveLength(2);
      expect(data1.total).toBeGreaterThanOrEqual(5);

      // Test offset
      const request2 = new NextRequest(
        "http://localhost:3000?limit=2&offset=2",
      );
      const response2 = await GET(request2, context);
      const data2 = await response2.json();
      expect(data2.turns).toHaveLength(2);
      expect(data2.turns[0].user_prompt).toBe("Question 2");
      expect(data2.turns[1].user_prompt).toBe("Question 3");

      // Test offset beyond available data
      const request3 = new NextRequest("http://localhost:3000?offset=10");
      const response3 = await GET(request3, context);
      const data3 = await response3.json();
      expect(data3.turns).toHaveLength(0);
      expect(data3.total).toBeGreaterThanOrEqual(5);
    });

    it("should order turns by creation date ascending", async () => {
      // Create turns with different timestamps
      const [turn1] = await globalThis.services.db
        .insert(TURNS_TBL)
        .values({
          id: `turn_order1_${Date.now()}`,
          sessionId,
          userPrompt: "First",
          status: "completed",
        })
        .returning();

      await new Promise((resolve) => setTimeout(resolve, 20));

      const [turn2] = await globalThis.services.db
        .insert(TURNS_TBL)
        .values({
          id: `turn_order2_${Date.now()}`,
          sessionId,
          userPrompt: "Second",
          status: "completed",
        })
        .returning();

      await new Promise((resolve) => setTimeout(resolve, 20));

      const [turn3] = await globalThis.services.db
        .insert(TURNS_TBL)
        .values({
          id: `turn_order3_${Date.now()}`,
          sessionId,
          userPrompt: "Third",
          status: "completed",
        })
        .returning();

      createdTurnIds.push(turn1.id, turn2.id, turn3.id);

      const request = new NextRequest("http://localhost:3000");
      const context = { params: Promise.resolve({ projectId, sessionId }) };

      const response = await GET(request, context);
      const data = await response.json();

      expect(data.turns).toHaveLength(3);
      expect(data.turns[0].user_prompt).toBe("First");
      expect(data.turns[1].user_prompt).toBe("Second");
      expect(data.turns[2].user_prompt).toBe("Third");
    });

    it("should not return turns from other sessions", async () => {
      // Create turn for test session
      const [turn1] = await globalThis.services.db
        .insert(TURNS_TBL)
        .values({
          id: `turn_sess1_${Date.now()}`,
          sessionId,
          userPrompt: "My turn",
          status: "completed",
        })
        .returning();
      createdTurnIds.push(turn1.id);

      // Create another session and turn
      const otherSessionId = `sess_other_${Date.now()}`;
      await globalThis.services.db.insert(SESSIONS_TBL).values({
        id: otherSessionId,
        projectId,
        title: "Other Session",
      });

      const [turn2] = await globalThis.services.db
        .insert(TURNS_TBL)
        .values({
          id: `turn_sess2_${Date.now()}`,
          sessionId: otherSessionId,
          userPrompt: "Other turn",
          status: "completed",
        })
        .returning();

      const request = new NextRequest("http://localhost:3000");
      const context = { params: Promise.resolve({ projectId, sessionId }) };

      const response = await GET(request, context);
      const data = await response.json();

      expect(data.turns).toHaveLength(1);
      expect(data.turns[0].user_prompt).toBe("My turn");

      // Clean up
      await globalThis.services.db
        .delete(TURNS_TBL)
        .where(eq(TURNS_TBL.id, turn2.id));
      await globalThis.services.db
        .delete(SESSIONS_TBL)
        .where(eq(SESSIONS_TBL.id, otherSessionId));
    });
  });
});
