import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import "../../../../../../../src/test/setup";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { POST as createProject } from "../../../../route";
import { POST as createSession } from "../../route";
import { initServices } from "../../../../../../../src/lib/init-services";
import { PROJECTS_TBL } from "../../../../../../../src/db/schema/projects";
import {
  SESSIONS_TBL,
  TURNS_TBL,
  BLOCKS_TBL,
} from "../../../../../../../src/db/schema/sessions";
import { eq } from "drizzle-orm";

// Mock Clerk authentication
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
const mockAuth = vi.mocked(auth);

describe("/api/projects/:projectId/sessions/:sessionId/last-block-id", () => {
  let projectId: string;
  let sessionId: string;
  const userId = `test-user-lastblock-${Date.now()}-${process.pid}`;
  let createdTurnIds: string[] = [];
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
      body: JSON.stringify({ name: "Test Project for Last Block ID" }),
    });
    const projectResponse = await createProject(createProjectRequest);
    expect(projectResponse.status).toBe(201);
    const projectData = await projectResponse.json();
    projectId = projectData.id;

    // Create test session using API
    const createSessionRequest = new NextRequest("http://localhost:3000", {
      method: "POST",
      body: JSON.stringify({ title: "Test Session for Last Block ID" }),
    });
    const sessionContext = { params: Promise.resolve({ projectId }) };
    const sessionResponse = await createSession(
      createSessionRequest,
      sessionContext,
    );
    expect(sessionResponse.status).toBe(200);
    const sessionData = await sessionResponse.json();
    sessionId = sessionData.id;

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

  describe("GET /api/projects/:projectId/sessions/:sessionId/last-block-id", () => {
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

    it("should return null when session has no blocks", async () => {
      const request = new NextRequest("http://localhost:3000");
      const context = { params: Promise.resolve({ projectId, sessionId }) };

      const response = await GET(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({ last_block_id: null });
    });

    it("should return the last block ID when session has one block", async () => {
      const [turn] = await globalThis.services.db
        .insert(TURNS_TBL)
        .values({
          id: `turn_${Date.now()}`,
          sessionId,
          userPrompt: "Question",
          status: "completed",
        })
        .returning();

      const [block] = await globalThis.services.db
        .insert(BLOCKS_TBL)
        .values({
          id: `block_${Date.now()}`,
          turnId: turn!.id,
          type: "content",
          content: { text: "Answer" },
        })
        .returning();

      createdTurnIds.push(turn!.id);
      createdBlockIds.push(block!.id);

      const request = new NextRequest("http://localhost:3000");
      const context = { params: Promise.resolve({ projectId, sessionId }) };

      const response = await GET(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({ last_block_id: block!.id });
    });

    it("should return the most recent block ID when session has multiple blocks", async () => {
      const [turn1] = await globalThis.services.db
        .insert(TURNS_TBL)
        .values({
          id: `turn_1_${Date.now()}`,
          sessionId,
          userPrompt: "Question 1",
          status: "completed",
        })
        .returning();

      const [block1] = await globalThis.services.db
        .insert(BLOCKS_TBL)
        .values({
          id: `block_1_${Date.now()}`,
          turnId: turn1!.id,
          type: "content",
          content: { text: "Answer 1" },
          createdAt: new Date("2024-01-01T00:00:00Z"),
        })
        .returning();

      const [turn2] = await globalThis.services.db
        .insert(TURNS_TBL)
        .values({
          id: `turn_2_${Date.now()}`,
          sessionId,
          userPrompt: "Question 2",
          status: "completed",
        })
        .returning();

      const [block2] = await globalThis.services.db
        .insert(BLOCKS_TBL)
        .values({
          id: `block_2_${Date.now()}`,
          turnId: turn2!.id,
          type: "content",
          content: { text: "Answer 2" },
          createdAt: new Date("2024-01-01T00:00:01Z"),
        })
        .returning();

      createdTurnIds.push(turn1!.id, turn2!.id);
      createdBlockIds.push(block1!.id, block2!.id);

      const request = new NextRequest("http://localhost:3000");
      const context = { params: Promise.resolve({ projectId, sessionId }) };

      const response = await GET(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({ last_block_id: block2!.id });
    });
  });
});
