import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, PATCH } from "./route";
import { initServices } from "../../../../../../src/lib/init-services";
import { PROJECTS_TBL } from "../../../../../../src/db/schema/projects";
import { SESSIONS_TBL, TURNS_TBL, BLOCKS_TBL } from "../../../../../../src/db/schema/sessions";
import { eq } from "drizzle-orm";
import * as Y from "yjs";

// Mock Clerk authentication
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
const mockAuth = vi.mocked(auth);

describe("/api/projects/:projectId/sessions/:sessionId", () => {
  const projectId = `proj_sess_detail_${Date.now()}`;
  const userId = "test-user-session-detail";
  let sessionId: string;
  let createdTurnIds: string[] = [];

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
    const [session] = await globalThis.services.db
      .insert(SESSIONS_TBL)
      .values({
        id: `sess_detail_${Date.now()}`,
        projectId,
        title: "Test Session",
      })
      .returning();

    sessionId = session.id;
    createdTurnIds = [];
  });

  afterEach(async () => {
    // Clean up turns and blocks
    for (const turnId of createdTurnIds) {
      await globalThis.services.db
        .delete(BLOCKS_TBL)
        .where(eq(BLOCKS_TBL.turnId, turnId));
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

  describe("GET /api/projects/:projectId/sessions/:sessionId", () => {
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
          sessionId 
        }) 
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
          sessionId: "non-existent" 
        }) 
      };

      const response = await GET(request, context);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data).toHaveProperty("error", "session_not_found");
    });

    it("should return session details with empty turn_ids", async () => {
      const request = new NextRequest("http://localhost:3000");
      const context = { params: Promise.resolve({ projectId, sessionId }) };

      const response = await GET(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("id", sessionId);
      expect(data).toHaveProperty("project_id", projectId);
      expect(data).toHaveProperty("title", "Test Session");
      expect(data).toHaveProperty("created_at");
      expect(data).toHaveProperty("updated_at");
      expect(data).toHaveProperty("turn_ids");
      expect(data.turn_ids).toEqual([]);
    });

    it("should return session details with turn_ids in order", async () => {
      // Create turns
      const turn1 = await globalThis.services.db
        .insert(TURNS_TBL)
        .values({
          id: `turn_1_${Date.now()}`,
          sessionId,
          userPrompt: "First prompt",
          status: "completed",
        })
        .returning();

      await new Promise(resolve => setTimeout(resolve, 10));

      const turn2 = await globalThis.services.db
        .insert(TURNS_TBL)
        .values({
          id: `turn_2_${Date.now()}`,
          sessionId,
          userPrompt: "Second prompt",
          status: "running",
        })
        .returning();

      createdTurnIds.push(turn1[0].id, turn2[0].id);

      const request = new NextRequest("http://localhost:3000");
      const context = { params: Promise.resolve({ projectId, sessionId }) };

      const response = await GET(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.turn_ids).toHaveLength(2);
      expect(data.turn_ids[0]).toBe(turn1[0].id);
      expect(data.turn_ids[1]).toBe(turn2[0].id);
    });
  });

  describe("PATCH /api/projects/:projectId/sessions/:sessionId", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValueOnce({ userId: null } as Awaited<
        ReturnType<typeof auth>
      >);

      const request = new NextRequest("http://localhost:3000", {
        method: "PATCH",
        body: JSON.stringify({ title: "Updated Title" }),
      });
      const context = { params: Promise.resolve({ projectId, sessionId }) };

      const response = await PATCH(request, context);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty("error", "unauthorized");
    });

    it("should return 404 when project doesn't exist", async () => {
      const request = new NextRequest("http://localhost:3000", {
        method: "PATCH",
        body: JSON.stringify({ title: "Updated Title" }),
      });
      const context = { 
        params: Promise.resolve({ 
          projectId: "non-existent", 
          sessionId 
        }) 
      };

      const response = await PATCH(request, context);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data).toHaveProperty("error", "project_not_found");
    });

    it("should return 404 when session doesn't exist", async () => {
      const request = new NextRequest("http://localhost:3000", {
        method: "PATCH",
        body: JSON.stringify({ title: "Updated Title" }),
      });
      const context = { 
        params: Promise.resolve({ 
          projectId, 
          sessionId: "non-existent" 
        }) 
      };

      const response = await PATCH(request, context);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data).toHaveProperty("error", "session_not_found");
    });

    it("should update session title", async () => {
      const request = new NextRequest("http://localhost:3000", {
        method: "PATCH",
        body: JSON.stringify({ title: "Updated Session Title" }),
      });
      const context = { params: Promise.resolve({ projectId, sessionId }) };

      const response = await PATCH(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("id", sessionId);
      expect(data).toHaveProperty("title", "Updated Session Title");
      expect(data).toHaveProperty("updated_at");

      // Verify in database
      const [updatedSession] = await globalThis.services.db
        .select()
        .from(SESSIONS_TBL)
        .where(eq(SESSIONS_TBL.id, sessionId));

      expect(updatedSession.title).toBe("Updated Session Title");
      expect(updatedSession.updatedAt.getTime()).toBeGreaterThan(
        updatedSession.createdAt.getTime()
      );
    });

    it("should clear session title when set to null", async () => {
      const request = new NextRequest("http://localhost:3000", {
        method: "PATCH",
        body: JSON.stringify({ title: null }),
      });
      const context = { params: Promise.resolve({ projectId, sessionId }) };

      const response = await PATCH(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("title", null);

      // Verify in database
      const [updatedSession] = await globalThis.services.db
        .select()
        .from(SESSIONS_TBL)
        .where(eq(SESSIONS_TBL.id, sessionId));

      expect(updatedSession.title).toBeNull();
    });

    it("should not change title when not provided", async () => {
      const request = new NextRequest("http://localhost:3000", {
        method: "PATCH",
        body: JSON.stringify({}),
      });
      const context = { params: Promise.resolve({ projectId, sessionId }) };

      const response = await PATCH(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("title", "Test Session");

      // Verify in database
      const [updatedSession] = await globalThis.services.db
        .select()
        .from(SESSIONS_TBL)
        .where(eq(SESSIONS_TBL.id, sessionId));

      expect(updatedSession.title).toBe("Test Session");
    });
  });
});