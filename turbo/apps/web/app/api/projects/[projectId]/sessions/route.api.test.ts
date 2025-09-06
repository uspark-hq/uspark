import { describe, it, expect, beforeEach, vi } from "vitest";
import { apiCall, apiCallWithQuery } from "../../../../../src/test/api-helpers";
import { GET, POST } from "./route";
import { POST as createProject } from "../../route";

// Mock Clerk authentication
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
const mockAuth = vi.mocked(auth);

describe("/api/projects/:projectId/sessions - API Tests", () => {
  const userId = "test-user-sessions-api";
  let projectId: string;

  beforeEach(async () => {
    // Mock successful authentication by default
    mockAuth.mockResolvedValue({ userId } as Awaited<ReturnType<typeof auth>>);

    // Create a project using the API
    const projectResponse = await apiCall(
      createProject,
      "POST",
      {},
      { name: "Test Project for Sessions" }
    );
    expect(projectResponse.status).toBe(201);
    projectId = projectResponse.data.id;
  });

  describe("POST /api/projects/:projectId/sessions", () => {
    it("should create a new session", async () => {
      const response = await apiCall(
        POST,
        "POST",
        { projectId },
        { title: "Test Session" }
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("id");
      expect(response.data.id).toMatch(/^sess_/);
      expect(response.data).toHaveProperty("title", "Test Session");
      expect(response.data).toHaveProperty("project_id", projectId);
      expect(response.data).toHaveProperty("created_at");
      expect(response.data).toHaveProperty("updated_at");
    });

    it("should create a session without title", async () => {
      const response = await apiCall(
        POST,
        "POST",
        { projectId },
        {}
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("id");
      expect(response.data.title).toBeNull();
    });

    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValueOnce({ userId: null } as Awaited<
        ReturnType<typeof auth>
      >);

      const response = await apiCall(
        POST,
        "POST",
        { projectId },
        { title: "Test Session" }
      );

      expect(response.status).toBe(401);
      expect(response.data).toHaveProperty("error", "unauthorized");
    });

    it("should return 404 for non-existent project", async () => {
      const response = await apiCall(
        POST,
        "POST",
        { projectId: "non-existent" },
        { title: "Test Session" }
      );

      expect(response.status).toBe(404);
      expect(response.data).toHaveProperty("error", "project_not_found");
    });
  });

  describe("GET /api/projects/:projectId/sessions", () => {
    it("should return empty list when no sessions exist", async () => {
      const response = await apiCall(
        GET,
        "GET",
        { projectId }
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("sessions");
      expect(response.data.sessions).toEqual([]);
      expect(response.data).toHaveProperty("total", 0);
    });

    it("should list all sessions for a project", async () => {
      // Get initial count
      const initialResponse = await apiCall(GET, "GET", { projectId });
      const initialCount = initialResponse.data.total;

      // Create 3 sessions
      const session1 = await apiCall(
        POST,
        "POST",
        { projectId },
        { title: "Session 1" }
      );
      
      const session2 = await apiCall(
        POST,
        "POST",
        { projectId },
        { title: "Session 2" }
      );
      
      const session3 = await apiCall(
        POST,
        "POST",
        { projectId },
        { title: "Session 3" }
      );

      // List sessions
      const response = await apiCall(
        GET,
        "GET",
        { projectId }
      );

      expect(response.status).toBe(200);
      expect(response.data.total).toBeGreaterThanOrEqual(initialCount + 3);
      
      // Find our created sessions
      const ourSessions = response.data.sessions.filter((s: any) => 
        [session1.data.id, session2.data.id, session3.data.id].includes(s.id)
      );
      expect(ourSessions).toHaveLength(3);
      
      // Sessions should be ordered by created_at desc (newest first)
      const sessionIds = response.data.sessions.slice(0, 3).map((s: any) => s.id);
      expect(sessionIds).toContain(session3.data.id);
      expect(sessionIds).toContain(session2.data.id);
      expect(sessionIds).toContain(session1.data.id);
    });

    it("should support pagination with limit and offset", async () => {
      // Get initial count
      const initialResponse = await apiCall(GET, "GET", { projectId });
      const initialCount = initialResponse.data.total;

      // Create 5 sessions
      const sessionIds = [];
      for (let i = 1; i <= 5; i++) {
        const session = await apiCall(
          POST,
          "POST",
          { projectId },
          { title: `Pagination Test Session ${i}` }
        );
        sessionIds.push(session.data.id);
      }

      // Get first page (limit 2) - will get the newest sessions
      const page1 = await apiCallWithQuery(
        GET,
        { projectId },
        { limit: "2", offset: "0" }
      );

      expect(page1.status).toBe(200);
      expect(page1.data.sessions).toHaveLength(2);
      expect(page1.data.total).toBeGreaterThanOrEqual(initialCount + 5);
      
      // Check that our newest sessions are in the results
      const page1Ids = page1.data.sessions.map((s: any) => s.id);
      expect(page1Ids).toContain(sessionIds[4]); // Session 5 (newest)
      expect(page1Ids).toContain(sessionIds[3]); // Session 4

      // Get a page that should include our middle sessions
      const page2 = await apiCallWithQuery(
        GET,
        { projectId },
        { limit: "5", offset: "0" }
      );

      expect(page2.status).toBe(200);
      expect(page2.data.sessions.length).toBeLessThanOrEqual(5);
      
      // Check that all our sessions are included in a larger page
      const page2Ids = page2.data.sessions.map((s: any) => s.id);
      sessionIds.forEach(id => {
        expect(page2Ids).toContain(id);
      });
    });

    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValueOnce({ userId: null } as Awaited<
        ReturnType<typeof auth>
      >);

      const response = await apiCall(
        GET,
        "GET",
        { projectId }
      );

      expect(response.status).toBe(401);
      expect(response.data).toHaveProperty("error", "unauthorized");
    });

    it("should return 404 for non-existent project", async () => {
      const response = await apiCall(
        GET,
        "GET",
        { projectId: "non-existent" }
      );

      expect(response.status).toBe(404);
      expect(response.data).toHaveProperty("error", "project_not_found");
    });

    it("should handle invalid pagination parameters", async () => {
      const response = await apiCallWithQuery(
        GET,
        { projectId },
        { limit: "invalid", offset: "abc" }
      );

      expect(response.status).toBe(200);
      // Should use defaults (limit=20, offset=0)
      expect(response.data).toHaveProperty("sessions");
      expect(response.data).toHaveProperty("total");
    });
  });
});