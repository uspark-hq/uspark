import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";
import { initServices } from "../../../../../src/lib/init-services";
import { PROJECTS_TBL } from "../../../../../src/db/schema/projects";
import { SESSIONS_TBL, TURNS_TBL, BLOCKS_TBL } from "../../../../../src/db/schema/sessions";
import { eq } from "drizzle-orm";
import * as Y from "yjs";

// Mock Clerk authentication
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
const mockAuth = vi.mocked(auth);

describe("/api/projects/:projectId/sessions", () => {
  const projectId = `proj_test_${Date.now()}`;
  const userId = "test-user-sessions";
  let testSessionIds: string[] = [];

  beforeEach(async () => {
    // Mock successful authentication by default
    mockAuth.mockResolvedValue({ userId } as Awaited<ReturnType<typeof auth>>);

    // Initialize services
    initServices();

    // Clean up any existing test data
    // First delete blocks from test sessions
    const testSessions = await globalThis.services.db
      .select({ id: SESSIONS_TBL.id })
      .from(SESSIONS_TBL)
      .where(eq(SESSIONS_TBL.projectId, projectId));
    
    for (const session of testSessions) {
      const turns = await globalThis.services.db
        .select({ id: TURNS_TBL.id })
        .from(TURNS_TBL)
        .where(eq(TURNS_TBL.sessionId, session.id));
      
      for (const turn of turns) {
        await globalThis.services.db
          .delete(BLOCKS_TBL)
          .where(eq(BLOCKS_TBL.turnId, turn.id));
      }
      
      await globalThis.services.db
        .delete(TURNS_TBL)
        .where(eq(TURNS_TBL.sessionId, session.id));
    }

    // Delete sessions
    await globalThis.services.db
      .delete(SESSIONS_TBL)
      .where(eq(SESSIONS_TBL.projectId, projectId));

    // Delete project
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

    testSessionIds = [];
  });

  afterEach(async () => {
    // Clean up created sessions
    for (const sessionId of testSessionIds) {
      const turns = await globalThis.services.db
        .select({ id: TURNS_TBL.id })
        .from(TURNS_TBL)
        .where(eq(TURNS_TBL.sessionId, sessionId));
      
      for (const turn of turns) {
        await globalThis.services.db
          .delete(BLOCKS_TBL)
          .where(eq(BLOCKS_TBL.turnId, turn.id));
      }
      
      await globalThis.services.db
        .delete(TURNS_TBL)
        .where(eq(TURNS_TBL.sessionId, sessionId));
      
      await globalThis.services.db
        .delete(SESSIONS_TBL)
        .where(eq(SESSIONS_TBL.id, sessionId));
    }
  });

  describe("POST /api/projects/:projectId/sessions", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValueOnce({ userId: null } as Awaited<
        ReturnType<typeof auth>
      >);

      const request = new NextRequest("http://localhost:3000", {
        method: "POST",
        body: JSON.stringify({ title: "Test Session" }),
      });
      const context = { params: Promise.resolve({ projectId }) };

      const response = await POST(request, context);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty("error", "unauthorized");
    });

    it("should return 404 when project doesn't exist", async () => {
      const request = new NextRequest("http://localhost:3000", {
        method: "POST",
        body: JSON.stringify({ title: "Test Session" }),
      });
      const context = { params: Promise.resolve({ projectId: "non-existent" }) };

      const response = await POST(request, context);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data).toHaveProperty("error", "project_not_found");
    });

    it("should return 404 when project belongs to another user", async () => {
      // Create project for another user
      const otherProjectId = `proj_other_${Date.now()}`;
      const ydoc = new Y.Doc();
      const state = Y.encodeStateAsUpdate(ydoc);
      const base64Data = Buffer.from(state).toString("base64");

      await globalThis.services.db.insert(PROJECTS_TBL).values({
        id: otherProjectId,
        userId: "other-user",
        ydocData: base64Data,
        version: 0,
      });

      const request = new NextRequest("http://localhost:3000", {
        method: "POST",
        body: JSON.stringify({ title: "Test Session" }),
      });
      const context = { params: Promise.resolve({ projectId: otherProjectId }) };

      const response = await POST(request, context);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data).toHaveProperty("error", "project_not_found");

      // Clean up
      await globalThis.services.db
        .delete(PROJECTS_TBL)
        .where(eq(PROJECTS_TBL.id, otherProjectId));
    });

    it("should create session with title", async () => {
      const request = new NextRequest("http://localhost:3000", {
        method: "POST",
        body: JSON.stringify({ title: "My Test Session" }),
      });
      const context = { params: Promise.resolve({ projectId }) };

      const response = await POST(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("id");
      expect(data).toHaveProperty("project_id", projectId);
      expect(data).toHaveProperty("title", "My Test Session");
      expect(data).toHaveProperty("created_at");
      expect(data).toHaveProperty("updated_at");
      expect(data.id).toMatch(/^sess_/);

      testSessionIds.push(data.id);

      // Verify in database
      const [session] = await globalThis.services.db
        .select()
        .from(SESSIONS_TBL)
        .where(eq(SESSIONS_TBL.id, data.id));

      expect(session).toBeDefined();
      expect(session.projectId).toBe(projectId);
      expect(session.title).toBe("My Test Session");
    });

    it("should create session without title", async () => {
      const request = new NextRequest("http://localhost:3000", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const context = { params: Promise.resolve({ projectId }) };

      const response = await POST(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("id");
      expect(data).toHaveProperty("title", null);
      
      testSessionIds.push(data.id);
    });
  });

  describe("GET /api/projects/:projectId/sessions", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValueOnce({ userId: null } as Awaited<
        ReturnType<typeof auth>
      >);

      const request = new NextRequest("http://localhost:3000");
      const context = { params: Promise.resolve({ projectId }) };

      const response = await GET(request, context);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty("error", "unauthorized");
    });

    it("should return empty list when no sessions exist", async () => {
      const request = new NextRequest("http://localhost:3000");
      const context = { params: Promise.resolve({ projectId }) };

      const response = await GET(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("sessions");
      expect(data).toHaveProperty("total");
      expect(data.sessions).toEqual([]);
      expect(data.total).toBe(0);
    });

    it("should return sessions list ordered by creation date", async () => {
      // Create multiple sessions
      const session1 = await globalThis.services.db
        .insert(SESSIONS_TBL)
        .values({
          id: `sess_test1_${Date.now()}`,
          projectId,
          title: "Session 1",
        })
        .returning();

      await new Promise(resolve => setTimeout(resolve, 10)); // Ensure different timestamps

      const session2 = await globalThis.services.db
        .insert(SESSIONS_TBL)
        .values({
          id: `sess_test2_${Date.now()}`,
          projectId,
          title: "Session 2",
        })
        .returning();

      testSessionIds.push(session1[0].id, session2[0].id);

      const request = new NextRequest("http://localhost:3000");
      const context = { params: Promise.resolve({ projectId }) };

      const response = await GET(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.sessions).toHaveLength(2);
      expect(data.total).toBe(2);
      
      // Should be ordered by createdAt DESC (newest first)
      expect(data.sessions[0].title).toBe("Session 2");
      expect(data.sessions[1].title).toBe("Session 1");
    });

    it("should support pagination with limit and offset", async () => {
      // Create 5 sessions
      const sessionIds = [];
      for (let i = 0; i < 5; i++) {
        const [session] = await globalThis.services.db
          .insert(SESSIONS_TBL)
          .values({
            id: `sess_page_${i}_${Date.now()}`,
            projectId,
            title: `Session ${i}`,
          })
          .returning();
        sessionIds.push(session.id);
        testSessionIds.push(session.id);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Test limit
      const request1 = new NextRequest("http://localhost:3000?limit=2");
      const context = { params: Promise.resolve({ projectId }) };
      const response1 = await GET(request1, context);
      const data1 = await response1.json();
      expect(data1.sessions).toHaveLength(2);
      expect(data1.total).toBe(5);

      // Test offset
      const request2 = new NextRequest("http://localhost:3000?limit=2&offset=2");
      const response2 = await GET(request2, context);
      const data2 = await response2.json();
      expect(data2.sessions).toHaveLength(2);
      expect(data2.sessions[0].title).toBe("Session 2");
      expect(data2.sessions[1].title).toBe("Session 1");

      // Test offset beyond available data
      const request3 = new NextRequest("http://localhost:3000?offset=10");
      const response3 = await GET(request3, context);
      const data3 = await response3.json();
      expect(data3.sessions).toHaveLength(0);
      expect(data3.total).toBe(5);
    });

    it("should not return sessions from other projects", async () => {
      // Create session for test project
      const [session1] = await globalThis.services.db
        .insert(SESSIONS_TBL)
        .values({
          id: `sess_proj1_${Date.now()}`,
          projectId,
          title: "My Session",
        })
        .returning();
      testSessionIds.push(session1.id);

      // Create another project and session
      const otherProjectId = `proj_other_${Date.now()}`;
      await globalThis.services.db.insert(PROJECTS_TBL).values({
        id: otherProjectId,
        userId,
        ydocData: Buffer.from(Y.encodeStateAsUpdate(new Y.Doc())).toString("base64"),
        version: 0,
      });

      const [session2] = await globalThis.services.db
        .insert(SESSIONS_TBL)
        .values({
          id: `sess_proj2_${Date.now()}`,
          projectId: otherProjectId,
          title: "Other Session",
        })
        .returning();

      const request = new NextRequest("http://localhost:3000");
      const context = { params: Promise.resolve({ projectId }) };

      const response = await GET(request, context);
      const data = await response.json();
      
      expect(data.sessions).toHaveLength(1);
      expect(data.sessions[0].title).toBe("My Session");

      // Clean up
      await globalThis.services.db
        .delete(SESSIONS_TBL)
        .where(eq(SESSIONS_TBL.id, session2.id));
      await globalThis.services.db
        .delete(PROJECTS_TBL)
        .where(eq(PROJECTS_TBL.id, otherProjectId));
    });
  });
});