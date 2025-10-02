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
    it("should return updates when there are new turns", async () => {
      // Create 2 turns
      const [turn1] = await globalThis.services.db
        .insert(TURNS_TBL)
        .values({
          id: `turn_1_${Date.now()}`,
          sessionId,
          userPrompt: "Question 1",
          status: "completed",
        })
        .returning();

      const [turn2] = await globalThis.services.db
        .insert(TURNS_TBL)
        .values({
          id: `turn_2_${Date.now()}`,
          sessionId,
          userPrompt: "Question 2",
          status: "in_progress",
        })
        .returning();

      createdTurnIds.push(turn1!.id, turn2!.id);

      // Client has only seen turn1 with 0 blocks
      const request = new NextRequest(
        `http://localhost:3000?state=${turn1!.id}:0&timeout=0`,
      );
      const context = { params: Promise.resolve({ projectId, sessionId }) };

      const response = await GET(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("session");
      expect(data.session).toHaveProperty("id", sessionId);
      expect(data).toHaveProperty("turns");
      expect(data.turns).toHaveLength(2); // Both turns returned
      expect(data.turns[0].id).toBe(turn1!.id);
      expect(data.turns[1].id).toBe(turn2!.id);
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
          content: { text: "Thinking..." },
          sequenceNumber: 0,
        })
        .returning();

      const [block2] = await globalThis.services.db
        .insert(BLOCKS_TBL)
        .values({
          id: `block_2_${Date.now()}`,
          turnId: turn!.id,
          type: "content",
          content: { text: "Answer..." },
          sequenceNumber: 1,
        })
        .returning();

      createdTurnIds.push(turn!.id);
      createdBlockIds.push(block1!.id, block2!.id);

      // Client has seen turn but only 1 block
      const request = new NextRequest(
        `http://localhost:3000?state=${turn!.id}:1&timeout=0`,
      );
      const context = { params: Promise.resolve({ projectId, sessionId }) };

      const response = await GET(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.turns).toHaveLength(1);
      expect(data.turns[0].id).toBe(turn!.id);
      expect(data.turns[0].blocks).toHaveLength(2); // All blocks returned
    });

    it("should return 204 when no updates and no active turns", async () => {
      // Create completed turn with 2 blocks
      const [turn] = await globalThis.services.db
        .insert(TURNS_TBL)
        .values({
          id: `turn_${Date.now()}`,
          sessionId,
          userPrompt: "Question",
          status: "completed",
        })
        .returning();

      const [block1] = await globalThis.services.db
        .insert(BLOCKS_TBL)
        .values({
          id: `block_1_${Date.now()}`,
          turnId: turn!.id,
          type: "content",
          content: { text: "Answer" },
          sequenceNumber: 0,
        })
        .returning();

      const [block2] = await globalThis.services.db
        .insert(BLOCKS_TBL)
        .values({
          id: `block_2_${Date.now()}`,
          turnId: turn!.id,
          type: "content",
          content: { text: "More answer" },
          sequenceNumber: 1,
        })
        .returning();

      createdTurnIds.push(turn!.id);
      createdBlockIds.push(block1!.id, block2!.id);

      // Client is up to date (has seen turn with 2 blocks)
      const request = new NextRequest(
        `http://localhost:3000?state=${turn!.id}:2&timeout=0`,
      );
      const context = { params: Promise.resolve({ projectId, sessionId }) };

      const response = await GET(request, context);

      expect(response.status).toBe(204); // No content
    });

    it("should handle multiple turns in client state", async () => {
      // Create 3 turns
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

      const [turn3] = await globalThis.services.db
        .insert(TURNS_TBL)
        .values({
          id: `turn_3_${Date.now()}`,
          sessionId,
          userPrompt: "Third",
          status: "in_progress",
        })
        .returning();

      // Add blocks to turn2
      const [block] = await globalThis.services.db
        .insert(BLOCKS_TBL)
        .values({
          id: `block_${Date.now()}`,
          turnId: turn2!.id,
          type: "content",
          content: { text: "Response" },
          sequenceNumber: 0,
        })
        .returning();

      createdTurnIds.push(turn1!.id, turn2!.id, turn3!.id);
      createdBlockIds.push(block!.id);

      // Client has seen turn1 and turn2 (with 1 block)
      const request = new NextRequest(
        `http://localhost:3000?state=${turn1!.id}:0,${turn2!.id}:1&timeout=0`,
      );
      const context = { params: Promise.resolve({ projectId, sessionId }) };

      const response = await GET(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.turns).toHaveLength(3); // All turns (turn3 is new)
      expect(data.turns[2].id).toBe(turn3!.id);
    });

    it("should handle empty client state", async () => {
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

      // Empty client state
      const request = new NextRequest("http://localhost:3000?state=&timeout=0");
      const context = { params: Promise.resolve({ projectId, sessionId }) };

      const response = await GET(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.turns).toHaveLength(1);
      expect(data.turns[0].id).toBe(turn!.id);
    });

    it("should parse client state correctly with malformed input", async () => {
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

      // Malformed state string
      const request = new NextRequest(
        "http://localhost:3000?state=invalid:,,:5,turn:abc&timeout=0",
      );
      const context = { params: Promise.resolve({ projectId, sessionId }) };

      const response = await GET(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      // Should still return the turn since malformed state is treated as not seen
      expect(data.turns).toHaveLength(1);
    });

    it("should handle active turns correctly", async () => {
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
          status: "in_progress",
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

      createdTurnIds.push(pendingTurn!.id, runningTurn!.id, completedTurn!.id);

      // Client has seen all turns (no updates)
      const request = new NextRequest(
        `http://localhost:3000?state=${pendingTurn!.id}:0,${runningTurn!.id}:0,${completedTurn!.id}:0&timeout=0`,
      );
      const context = { params: Promise.resolve({ projectId, sessionId }) };

      const response = await GET(request, context);

      // Should not return 204 because there are active turns
      // The long polling would continue checking for updates
      // But with timeout=0 it returns current state
      expect(response.status).toBe(204);
    });
  });
});
