import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";
import { POST as createProject } from "../../route";
import { initServices } from "../../../../../src/lib/init-services";
import { PROJECTS_TBL } from "../../../../../src/db/schema/projects";
import {
  SESSIONS_TBL,
  TURNS_TBL,
  BLOCKS_TBL,
} from "../../../../../src/db/schema/sessions";
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

    // Create test project using API
    const createRequest = new NextRequest("http://localhost:3000", {
      method: "POST",
      body: JSON.stringify({ name: "Test Project" }),
    });
    const createResponse = await createProject(createRequest);
    expect(createResponse.status).toBe(201);
    const projectData = await createResponse.json();

    // Update the project with our test ID for consistency
    await globalThis.services.db
      .update(PROJECTS_TBL)
      .set({ id: projectId })
      .where(eq(PROJECTS_TBL.id, projectData.id));

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
      const context = {
        params: Promise.resolve({ projectId: "non-existent" }),
      };

      const response = await POST(request, context);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data).toHaveProperty("error", "project_not_found");
    });

    it("should return 404 when project belongs to another user", async () => {
      // Create project for another user using direct DB (needed for different user)
      const otherProjectId = `proj_other_${Date.now()}`;
      const ydoc = new Y.Doc();
      const state = Y.encodeStateAsUpdate(ydoc);
      const base64Data = Buffer.from(state).toString("base64");

      // Direct DB insert needed here because we need to test with a different userId
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
      const context = {
        params: Promise.resolve({ projectId: otherProjectId }),
      };

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
      // Create multiple sessions using API
      const request1 = new NextRequest("http://localhost:3000", {
        method: "POST",
        body: JSON.stringify({ title: "Session 1" }),
      });
      const context = { params: Promise.resolve({ projectId }) };
      const response1 = await POST(request1, context);
      expect(response1.status).toBe(200);
      const session1Data = await response1.json();
      testSessionIds.push(session1Data.id);

      const request2 = new NextRequest("http://localhost:3000", {
        method: "POST",
        body: JSON.stringify({ title: "Session 2" }),
      });
      const response2 = await POST(request2, context);
      expect(response2.status).toBe(200);
      const session2Data = await response2.json();
      testSessionIds.push(session2Data.id);

      const request = new NextRequest("http://localhost:3000");
      const response = await GET(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.sessions.length).toBeGreaterThanOrEqual(2);
      expect(data.total).toBeGreaterThanOrEqual(2);

      // Should be ordered by createdAt DESC (newest first)
      expect(data.sessions[0].title).toBe("Session 2");
      expect(data.sessions[1].title).toBe("Session 1");
    });

    it("should support pagination with limit and offset", async () => {
      // Create 5 sessions using API
      const sessionIds = [];
      const context = { params: Promise.resolve({ projectId }) };
      for (let i = 0; i < 5; i++) {
        const request = new NextRequest("http://localhost:3000", {
          method: "POST",
          body: JSON.stringify({ title: `Session ${i}` }),
        });
        const response = await POST(request, context);
        expect(response.status).toBe(200);
        const sessionData = await response.json();
        sessionIds.push(sessionData.id);
        testSessionIds.push(sessionData.id);
      }

      // Test limit
      const request1 = new NextRequest("http://localhost:3000?limit=2");
      const response1 = await GET(request1, context);
      const data1 = await response1.json();
      expect(data1.sessions).toHaveLength(2);
      expect(data1.total).toBeGreaterThanOrEqual(5);

      // Test offset
      const request2 = new NextRequest(
        "http://localhost:3000?limit=2&offset=2",
      );
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
      expect(data3.total).toBeGreaterThanOrEqual(5);
    });

    it("should not return sessions from other projects", async () => {
      // Create session for test project using API
      const request1 = new NextRequest("http://localhost:3000", {
        method: "POST",
        body: JSON.stringify({ title: "My Session" }),
      });
      const context1 = { params: Promise.resolve({ projectId }) };
      const response1 = await POST(request1, context1);
      expect(response1.status).toBe(200);
      const session1Data = await response1.json();
      testSessionIds.push(session1Data.id);

      // Create another project using API
      const otherProjectRequest = new NextRequest("http://localhost:3000", {
        method: "POST",
        body: JSON.stringify({ name: "Other Test Project" }),
      });
      const otherProjectResponse = await createProject(otherProjectRequest);
      expect(otherProjectResponse.status).toBe(201);
      const otherProjectData = await otherProjectResponse.json();
      const otherProjectId = otherProjectData.id;

      // Create session for other project using API
      const request2 = new NextRequest("http://localhost:3000", {
        method: "POST",
        body: JSON.stringify({ title: "Other Session" }),
      });
      const context2 = {
        params: Promise.resolve({ projectId: otherProjectId }),
      };
      const response2 = await POST(request2, context2);
      expect(response2.status).toBe(200);
      const session2Data = await response2.json();

      const request = new NextRequest("http://localhost:3000");
      const context = { params: Promise.resolve({ projectId }) };

      const response = await GET(request, context);
      const data = await response.json();

      expect(data.sessions).toHaveLength(1);
      expect(data.sessions[0].title).toBe("My Session");

      // Clean up
      await globalThis.services.db
        .delete(SESSIONS_TBL)
        .where(eq(SESSIONS_TBL.id, session2Data.id));
      await globalThis.services.db
        .delete(PROJECTS_TBL)
        .where(eq(PROJECTS_TBL.id, otherProjectId));
    });
  });
});
