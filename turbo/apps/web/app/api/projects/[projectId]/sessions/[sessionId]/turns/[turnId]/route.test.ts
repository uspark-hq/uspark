import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import "../../../../../../../../src/test/setup";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { POST as createTurn } from "../route";
import { POST as createProject } from "../../../../../route";
import { POST as createSession } from "../../../route";
import { initServices } from "../../../../../../../../src/lib/init-services";
import { PROJECTS_TBL } from "../../../../../../../../src/db/schema/projects";
import {
  SESSIONS_TBL,
  TURNS_TBL,
  BLOCKS_TBL,
} from "../../../../../../../../src/db/schema/sessions";
import { eq } from "drizzle-orm";

// Mock Clerk authentication
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
const mockAuth = vi.mocked(auth);

describe("/api/projects/:projectId/sessions/:sessionId/turns/:turnId", () => {
  let projectId: string;
  let sessionId: string;
  let turnId: string;
  const userId = `test-user-turn-detail-${Date.now()}-${process.pid}`;
  let createdBlockIds: string[] = [];

  beforeEach(async () => {
    vi.clearAllMocks();
    // Mock successful authentication by default
    mockAuth.mockResolvedValue({ userId } as Awaited<ReturnType<typeof auth>>);

    // Initialize services
    initServices();

    // Create test project using API
    const createProjectRequest = new NextRequest("http://localhost:3000", {
      method: "POST",
      body: JSON.stringify({ name: "Test Project for Turn Detail" }),
    });
    const projectResponse = await createProject(createProjectRequest);
    expect(projectResponse.status).toBe(201);
    const projectData = await projectResponse.json();
    projectId = projectData.id;

    // Create test session using API
    const createSessionRequest = new NextRequest("http://localhost:3000", {
      method: "POST",
      body: JSON.stringify({ title: "Test Session" }),
    });
    const sessionContext = { params: Promise.resolve({ projectId }) };
    const sessionResponse = await createSession(createSessionRequest, sessionContext);
    expect(sessionResponse.status).toBe(200);
    const sessionData = await sessionResponse.json();
    sessionId = sessionData.id;

    // Create test turn using API
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
    it("should return turn details", async () => {
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
      expect(data).toHaveProperty("status");
      expect(data).toHaveProperty("blocks");
      // Check that blocks is an array
      expect(Array.isArray(data.blocks)).toBe(true);
    });

    it("should return turn details with blocks in sequence order", async () => {
      // Create a new turn using API
      const manualTurnRequest = new NextRequest("http://localhost:3000", {
        method: "POST",
        body: JSON.stringify({ user_message: "Manual test prompt" }),
      });
      const manualTurnContext = { params: Promise.resolve({ projectId, sessionId }) };
      const manualTurnResponse = await createTurn(manualTurnRequest, manualTurnContext);
      expect(manualTurnResponse.status).toBe(200);
      const manualTurnData = await manualTurnResponse.json();
      const manualTurnId = manualTurnData.id;

      // Create blocks for this manual turn
      const [block1] = await globalThis.services.db
        .insert(BLOCKS_TBL)
        .values({
          id: `block_thinking_${Date.now()}`,
          turnId: manualTurnId,
          type: "thinking",
          content: { text: "Let me think about this..." },
          sequenceNumber: 0,
        })
        .returning();

      const [block2] = await globalThis.services.db
        .insert(BLOCKS_TBL)
        .values({
          id: `block_tool_${Date.now()}`,
          turnId: manualTurnId,
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
          turnId: manualTurnId,
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
          turnId: manualTurnId,
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
        params: Promise.resolve({ projectId, sessionId, turnId: manualTurnId }),
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
