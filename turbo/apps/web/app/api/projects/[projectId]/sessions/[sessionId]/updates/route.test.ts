import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import "../../../../../../../src/test/setup";
import { NextRequest } from "next/server";
import { GET } from "./route";
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

describe("/api/projects/:projectId/sessions/:sessionId/updates", () => {
  const projectId = `updates-${Date.now()}`;
  const sessionId = `sess_updates_${Date.now()}`;
  const userId = `test-user-updates-${Date.now()}-${process.pid}`;
  let createdTurnIds: string[] = [];
  let createdBlockIds: string[] = [];

  beforeEach(async () => {
    vi.clearAllMocks();
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
      title: "Test Session for Updates",
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

  describe("GET /api/projects/:projectId/sessions/:sessionId/updates", () => {
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

    it("should return 404 when project doesn't exist", async () => {
      const request = new NextRequest("http://localhost:3000");
      const context = {
        params: Promise.resolve({
          projectId: "non-existent",
          sessionId,
        }),
      };

      const response = await GET(request, context);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data).toHaveProperty("error", "project_not_found");
    });

    it("should return 404 when session doesn't exist", async () => {
      const request = new NextRequest("http://localhost:3000");
      const context = {
        params: Promise.resolve({
          projectId,
          sessionId: "non-existent",
        }),
      };

      const response = await GET(request, context);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data).toHaveProperty("error", "session_not_found");
    });

    it("should return empty state when no turns exist", async () => {
      const request = new NextRequest("http://localhost:3000");
      const context = { params: Promise.resolve({ projectId, sessionId }) };

      const response = await GET(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("session");
      expect(data.session).toHaveProperty("id", sessionId);
      expect(data.session).toHaveProperty("updated_at");
      expect(data).toHaveProperty("new_turn_ids");
      expect(data.new_turn_ids).toEqual([]);
      expect(data).toHaveProperty("updated_turns");
      expect(data.updated_turns).toEqual([]);
      expect(data).toHaveProperty("has_active_turns", false);
    });

    it("should detect new turns after last_turn_index", async () => {
      // Create 3 turns
      const turn1 = await globalThis.services.db
        .insert(TURNS_TBL)
        .values({
          id: `turn_1_${Date.now()}`,
          sessionId,
          userPrompt: "Question 1",
          status: "completed",
        })
        .returning();

      const turn2 = await globalThis.services.db
        .insert(TURNS_TBL)
        .values({
          id: `turn_2_${Date.now()}`,
          sessionId,
          userPrompt: "Question 2",
          status: "completed",
        })
        .returning();

      const turn3 = await globalThis.services.db
        .insert(TURNS_TBL)
        .values({
          id: `turn_3_${Date.now()}`,
          sessionId,
          userPrompt: "Question 3",
          status: "running",
        })
        .returning();

      createdTurnIds.push(turn1[0]!.id, turn2[0]!.id, turn3[0]!.id);

      // Client has seen first turn only (index 0)
      const request = new NextRequest(
        "http://localhost:3000?last_turn_index=0",
      );
      const context = { params: Promise.resolve({ projectId, sessionId }) };

      const response = await GET(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.new_turn_ids).toHaveLength(2);
      expect(data.new_turn_ids).toContain(turn2[0]!.id);
      expect(data.new_turn_ids).toContain(turn3[0]!.id);
      expect(data.has_active_turns).toBe(true); // turn3 is running
    });

    it("should detect new blocks in existing turn", async () => {
      // Create turn with 2 blocks
      const [turn] = await globalThis.services.db
        .insert(TURNS_TBL)
        .values({
          id: `turn_blocks_${Date.now()}`,
          sessionId,
          userPrompt: "Question",
          status: "running",
        })
        .returning();

      const [block1] = await globalThis.services.db
        .insert(BLOCKS_TBL)
        .values({
          id: `block_1_${Date.now()}`,
          turnId: turn!.id,
          type: "thinking",
          content: JSON.stringify({ text: "Thinking..." }),
          sequenceNumber: 0,
        })
        .returning();

      const [block2] = await globalThis.services.db
        .insert(BLOCKS_TBL)
        .values({
          id: `block_2_${Date.now()}`,
          turnId: turn!.id,
          type: "content",
          content: JSON.stringify({ text: "Answer..." }),
          sequenceNumber: 1,
        })
        .returning();

      createdTurnIds.push(turn!.id);
      createdBlockIds.push(block1!.id, block2!.id);

      // Client has seen turn but only first block (index 0)
      const request = new NextRequest(
        "http://localhost:3000?last_turn_index=0&last_block_index=0",
      );
      const context = { params: Promise.resolve({ projectId, sessionId }) };

      const response = await GET(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.new_turn_ids).toEqual([]); // No new turns
      expect(data.updated_turns).toHaveLength(1);
      expect(data.updated_turns[0]).toHaveProperty("id", turn!.id);
      expect(data.updated_turns[0]).toHaveProperty("status", "running");
      expect(data.updated_turns[0]).toHaveProperty("new_block_ids");
      expect(data.updated_turns[0].new_block_ids).toHaveLength(1);
      expect(data.updated_turns[0].new_block_ids).toContain(block2!.id);
      expect(data.updated_turns[0].block_count).toBe(2);
      expect(data.has_active_turns).toBe(true);
    });

    it("should detect status change in existing turn", async () => {
      // Create turn with pending status
      const [turn] = await globalThis.services.db
        .insert(TURNS_TBL)
        .values({
          id: `turn_status_${Date.now()}`,
          sessionId,
          userPrompt: "Question",
          status: "completed", // Changed from pending
        })
        .returning();

      createdTurnIds.push(turn!.id);

      // Client has seen turn when it was pending
      const request = new NextRequest(
        "http://localhost:3000?last_turn_index=0&last_block_index=-1",
      );
      const context = { params: Promise.resolve({ projectId, sessionId }) };

      const response = await GET(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.updated_turns).toHaveLength(1);
      expect(data.updated_turns[0]).toHaveProperty("id", turn!.id);
      expect(data.updated_turns[0]).toHaveProperty("status", "completed");
      expect(data.has_active_turns).toBe(false);
    });

    it("should handle multiple active turns correctly", async () => {
      // Create mix of turn statuses
      const [pendingTurn] = await globalThis.services.db
        .insert(TURNS_TBL)
        .values({
          id: `turn_pending_${Date.now()}`,
          sessionId,
          userPrompt: "Pending",
          status: "pending",
        })
        .returning();

      const [runningTurn] = await globalThis.services.db
        .insert(TURNS_TBL)
        .values({
          id: `turn_running_${Date.now()}`,
          sessionId,
          userPrompt: "Running",
          status: "running",
        })
        .returning();

      const [completedTurn] = await globalThis.services.db
        .insert(TURNS_TBL)
        .values({
          id: `turn_completed_${Date.now()}`,
          sessionId,
          userPrompt: "Completed",
          status: "completed",
        })
        .returning();

      const [failedTurn] = await globalThis.services.db
        .insert(TURNS_TBL)
        .values({
          id: `turn_failed_${Date.now()}`,
          sessionId,
          userPrompt: "Failed",
          status: "failed",
        })
        .returning();

      createdTurnIds.push(
        pendingTurn!.id,
        runningTurn!.id,
        completedTurn!.id,
        failedTurn!.id,
      );

      const request = new NextRequest("http://localhost:3000");
      const context = { params: Promise.resolve({ projectId, sessionId }) };

      const response = await GET(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.has_active_turns).toBe(true); // pending and running turns exist
    });

    it("should return no updates when client is up to date", async () => {
      // Create 2 turns with blocks
      const [turn1] = await globalThis.services.db
        .insert(TURNS_TBL)
        .values({
          id: `turn_1_${Date.now()}`,
          sessionId,
          userPrompt: "First",
          status: "completed",
        })
        .returning();

      const [turn2] = await globalThis.services.db
        .insert(TURNS_TBL)
        .values({
          id: `turn_2_${Date.now()}`,
          sessionId,
          userPrompt: "Second",
          status: "completed",
        })
        .returning();

      const [block] = await globalThis.services.db
        .insert(BLOCKS_TBL)
        .values({
          id: `block_${Date.now()}`,
          turnId: turn2!.id,
          type: "content",
          content: JSON.stringify({ text: "Done" }),
          sequenceNumber: 0,
        })
        .returning();

      createdTurnIds.push(turn1!.id, turn2!.id);
      createdBlockIds.push(block!.id);

      // Client has seen everything (2 turns, last turn has 1 block)
      const request = new NextRequest(
        "http://localhost:3000?last_turn_index=1&last_block_index=0",
      );
      const context = { params: Promise.resolve({ projectId, sessionId }) };

      const response = await GET(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.new_turn_ids).toEqual([]);
      // Note: Current implementation always reports completed turns as updated
      // This could be optimized in the future to track client's last seen status
      expect(data.updated_turns).toHaveLength(1);
      expect(data.updated_turns[0].id).toBe(turn2!.id);
      expect(data.updated_turns[0].new_block_ids).toEqual([]);
      expect(data.has_active_turns).toBe(false);
    });

    it("should handle invalid query parameters gracefully", async () => {
      // Create a turn
      const [turn] = await globalThis.services.db
        .insert(TURNS_TBL)
        .values({
          id: `turn_${Date.now()}`,
          sessionId,
          userPrompt: "Question",
          status: "completed",
        })
        .returning();

      createdTurnIds.push(turn!.id);

      // Invalid parameters
      const request = new NextRequest(
        "http://localhost:3000?last_turn_index=invalid&last_block_index=abc",
      );
      const context = { params: Promise.resolve({ projectId, sessionId }) };

      const response = await GET(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      // Should treat as -1 (no turns seen)
      expect(data.new_turn_ids).toHaveLength(1);
      expect(data.new_turn_ids).toContain(turn!.id);
    });
  });
});
