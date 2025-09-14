import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import "../../../../../../../../src/test/setup";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { POST as createTurn } from "../route";
import { initServices } from "../../../../../../../../src/lib/init-services";
import { PROJECTS_TBL } from "../../../../../../../../src/db/schema/projects";
import {
  SESSIONS_TBL,
  TURNS_TBL,
  BLOCKS_TBL,
} from "../../../../../../../../src/db/schema/sessions";
import { eq } from "drizzle-orm";
import * as Y from "yjs";

// Mock Clerk authentication
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
const mockAuth = vi.mocked(auth);

describe("/api/projects/:projectId/sessions/:sessionId/turns/:turnId", () => {
  const projectId = `turn_detail-${Date.now()}`;
  const sessionId = `sess_turn_detail_${Date.now()}`;
  let turnId: string;
  const userId = `test-user-turn-detail-${Date.now()}-${process.pid}`;
  let createdBlockIds: string[] = [];

  beforeEach(async () => {
    vi.clearAllMocks();
    // Mock successful authentication by default
    mockAuth.mockResolvedValue({ userId } as Awaited<ReturnType<typeof auth>>);

    // Initialize services
    initServices();

    // Clean up any existing test data in correct order (child tables first)
    await globalThis.services.db
      .delete(BLOCKS_TBL)
      .where(eq(BLOCKS_TBL.turnId, turnId));
    await globalThis.services.db
      .delete(TURNS_TBL)
      .where(eq(TURNS_TBL.sessionId, sessionId));
    await globalThis.services.db
      .delete(SESSIONS_TBL)
      .where(eq(SESSIONS_TBL.projectId, projectId));
    await globalThis.services.db
      .delete(PROJECTS_TBL)
      .where(eq(PROJECTS_TBL.id, projectId));

    // Create test project directly with desired ID
    const ydoc = new Y.Doc();
    const ydocData = Buffer.from(Y.encodeStateAsUpdate(ydoc)).toString(
      "base64",
    );

    await globalThis.services.db.insert(PROJECTS_TBL).values({
      id: projectId,
      userId,
      ydocData,
      version: 0,
    });

    // Create test session directly with desired ID
    await globalThis.services.db.insert(SESSIONS_TBL).values({
      id: sessionId,
      projectId,
      title: "Test Session",
    });

    // Create test turn using API (this can use the API since we don't need to change its ID)
    const createTurnRequest = new NextRequest("http://localhost:3000", {
      method: "POST",
      body: JSON.stringify({ user_message: "Test prompt" }),
    });
    const turnContext = { params: Promise.resolve({ projectId, sessionId }) };
    const turnResponse = await createTurn(createTurnRequest, turnContext);
    expect(turnResponse.status).toBe(200);
    const turnData = await turnResponse.json();
    turnId = turnData.id;

    createdBlockIds = [];
  });

  afterEach(async () => {
    // Clean up blocks
    for (const blockId of createdBlockIds) {
      await globalThis.services.db
        .delete(BLOCKS_TBL)
        .where(eq(BLOCKS_TBL.id, blockId));
    }

    // Clean up turn
    await globalThis.services.db
      .delete(TURNS_TBL)
      .where(eq(TURNS_TBL.id, turnId));

    // Clean up session
    await globalThis.services.db
      .delete(SESSIONS_TBL)
      .where(eq(SESSIONS_TBL.id, sessionId));

    // Clean up project
    await globalThis.services.db
      .delete(PROJECTS_TBL)
      .where(eq(PROJECTS_TBL.id, projectId));
  });

  describe("GET /api/projects/:projectId/sessions/:sessionId/turns/:turnId", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValueOnce({ userId: null } as Awaited<
        ReturnType<typeof auth>
      >);

      const request = new NextRequest("http://localhost:3000");
      const context = {
        params: Promise.resolve({ projectId, sessionId, turnId }),
      };

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
          turnId,
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
          turnId,
        }),
      };

      const response = await GET(request, context);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data).toHaveProperty("error", "session_not_found");
    });

    it("should return 404 when turn doesn't exist", async () => {
      const request = new NextRequest("http://localhost:3000");
      const context = {
        params: Promise.resolve({
          projectId,
          sessionId,
          turnId: "non-existent",
        }),
      };

      const response = await GET(request, context);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data).toHaveProperty("error", "turn_not_found");
    });

    it("should return turn details without blocks", async () => {
      const request = new NextRequest("http://localhost:3000");
      const context = {
        params: Promise.resolve({ projectId, sessionId, turnId }),
      };

      const response = await GET(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("id", turnId);
      expect(data).toHaveProperty("session_id", sessionId);
      expect(data).toHaveProperty("user_prompt", "Test prompt");
      expect(data).toHaveProperty("status", "pending");
      expect(data).toHaveProperty("started_at", null);
      expect(data).toHaveProperty("completed_at", null);
      expect(data).toHaveProperty("blocks");
      expect(data.blocks).toEqual([]);
    });

    it("should return turn details with blocks in sequence order", async () => {
      // Create blocks
      const [block1] = await globalThis.services.db
        .insert(BLOCKS_TBL)
        .values({
          id: `block_thinking_${Date.now()}`,
          turnId,
          type: "thinking",
          content: { text: "Let me think about this..." },
          sequenceNumber: 0,
        })
        .returning();

      const [block2] = await globalThis.services.db
        .insert(BLOCKS_TBL)
        .values({
          id: `block_tool_${Date.now()}`,
          turnId,
          type: "tool_use",
          content: {
            tool_name: "read_file",
            parameters: { path: "/test.txt" },
            tool_use_id: "tool_123",
          },
          sequenceNumber: 1,
        })
        .returning();

      const [block3] = await globalThis.services.db
        .insert(BLOCKS_TBL)
        .values({
          id: `block_result_${Date.now()}`,
          turnId,
          type: "tool_result",
          content: {
            tool_use_id: "tool_123",
            result: "File contents...",
            error: null,
          },
          sequenceNumber: 2,
        })
        .returning();

      const [block4] = await globalThis.services.db
        .insert(BLOCKS_TBL)
        .values({
          id: `block_content_${Date.now()}`,
          turnId,
          type: "content",
          content: {
            text: "Based on the file, the answer is...",
          },
          sequenceNumber: 3,
        })
        .returning();

      createdBlockIds.push(block1!.id, block2!.id, block3!.id, block4!.id);

      const request = new NextRequest("http://localhost:3000");
      const context = {
        params: Promise.resolve({ projectId, sessionId, turnId }),
      };

      const response = await GET(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.blocks).toHaveLength(4);

      // Check blocks are in sequence order
      expect(data.blocks[0].type).toBe("thinking");
      expect(data.blocks[0].content.text).toBe("Let me think about this...");
      expect(data.blocks[0].sequence_number).toBe(0);

      expect(data.blocks[1].type).toBe("tool_use");
      expect(data.blocks[1].content.tool_name).toBe("read_file");
      expect(data.blocks[1].sequence_number).toBe(1);

      expect(data.blocks[2].type).toBe("tool_result");
      expect(data.blocks[2].content.result).toBe("File contents...");
      expect(data.blocks[2].sequence_number).toBe(2);

      expect(data.blocks[3].type).toBe("content");
      expect(data.blocks[3].content.text).toBe(
        "Based on the file, the answer is...",
      );
      expect(data.blocks[3].sequence_number).toBe(3);
    });
  });
});
