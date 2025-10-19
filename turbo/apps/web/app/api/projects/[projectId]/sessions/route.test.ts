import { describe, it, expect, beforeEach, vi } from "vitest";
import "../../../../../src/test/setup";
import { GET, POST } from "./route";
import { POST as createProject } from "../../route";
import { apiCall, apiCallWithQuery } from "../../../../../src/test/api-helpers";

// Mock Clerk authentication
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
const mockAuth = vi.mocked(auth);

describe("/api/projects/:projectId/sessions", () => {
  const userId = `test-user-sessions-${Date.now()}-${process.pid}`;
  let projectId: string;
  const createdSessionIds: string[] = [];
  const createdProjectIds: string[] = [];

  beforeEach(async () => {
    vi.clearAllMocks();
    // Mock successful authentication by default
    mockAuth.mockResolvedValue({ userId } as Awaited<ReturnType<typeof auth>>);

    // Create test project using API with unique name
    const projectResponse = await apiCall(
      createProject,
      "POST",
      {},
      { name: `Test Project for Sessions ${Date.now()}` },
    );
    expect(projectResponse.status).toBe(201);
    projectId = projectResponse.data.id;
    createdProjectIds.push(projectId);

    // Clear session tracking
    createdSessionIds.length = 0;
  });

  describe("POST /api/projects/:projectId/sessions", () => {
    it("should create session with title", async () => {
      const response = await apiCall(
        POST,
        "POST",
        { projectId },
        { title: "My Test Session" },
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("id");
      expect(response.data).toHaveProperty("project_id", projectId);
      expect(response.data).toHaveProperty("title", "My Test Session");
      expect(response.data).toHaveProperty("created_at");
      expect(response.data).toHaveProperty("updated_at");
      expect(response.data.id).toMatch(/^sess_/);

      createdSessionIds.push(response.data.id);

      // Verify via GET API
      const getResponse = await apiCall(GET, "GET", { projectId });
      expect(getResponse.status).toBe(200);
      const sessions = getResponse.data.sessions;
      const createdSession = sessions.find(
        (s: { id: string }) => s.id === response.data.id,
      );
      expect(createdSession).toBeDefined();
      expect(createdSession.title).toBe("My Test Session");
    });

    it("should create session without title", async () => {
      const response = await apiCall(POST, "POST", { projectId }, {});

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("id");
      expect(response.data).toHaveProperty("title", null);

      createdSessionIds.push(response.data.id);
    });
  });

  describe("GET /api/projects/:projectId/sessions", () => {
    it("should return empty list when no sessions exist", async () => {
      const response = await apiCall(GET, "GET", { projectId });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("sessions");
      expect(response.data).toHaveProperty("total");
      expect(response.data.sessions).toEqual([]);
      expect(response.data.total).toBe(0);
    });

    it("should return sessions list ordered by creation date", async () => {
      // Create multiple sessions using API
      const response1 = await apiCall(
        POST,
        "POST",
        { projectId },
        { title: "Session 1" },
      );
      expect(response1.status).toBe(200);
      createdSessionIds.push(response1.data.id);

      const response2 = await apiCall(
        POST,
        "POST",
        { projectId },
        { title: "Session 2" },
      );
      expect(response2.status).toBe(200);
      createdSessionIds.push(response2.data.id);

      const response = await apiCall(GET, "GET", { projectId });

      expect(response.status).toBe(200);
      expect(response.data.sessions.length).toBeGreaterThanOrEqual(2);
      expect(response.data.total).toBeGreaterThanOrEqual(2);

      // Should be ordered by createdAt DESC (newest first)
      expect(response.data.sessions[0].title).toBe("Session 2");
      expect(response.data.sessions[1].title).toBe("Session 1");
    });

    it("should support pagination with limit and offset", async () => {
      // Create 5 sessions using API
      for (let i = 0; i < 5; i++) {
        const response = await apiCall(
          POST,
          "POST",
          { projectId },
          { title: `Session ${i}` },
        );
        expect(response.status).toBe(200);
        createdSessionIds.push(response.data.id);
      }

      // Test limit
      const response1 = await apiCallWithQuery(
        GET,
        { projectId },
        { limit: "2" },
      );
      expect(response1.data.sessions).toHaveLength(2);
      expect(response1.data.total).toBeGreaterThanOrEqual(5);

      // Test offset
      const response2 = await apiCallWithQuery(
        GET,
        { projectId },
        { limit: "2", offset: "2" },
      );
      expect(response2.data.sessions).toHaveLength(2);
      expect(response2.data.sessions[0].title).toBe("Session 2");
      expect(response2.data.sessions[1].title).toBe("Session 1");

      // Test offset beyond available data
      const response3 = await apiCallWithQuery(
        GET,
        { projectId },
        { offset: "10" },
      );
      expect(response3.data.sessions).toHaveLength(0);
      expect(response3.data.total).toBeGreaterThanOrEqual(5);
    });

    it("should not return sessions from other projects", async () => {
      // Create session for test project using API
      const response1 = await apiCall(
        POST,
        "POST",
        { projectId },
        { title: "My Session" },
      );
      expect(response1.status).toBe(200);
      createdSessionIds.push(response1.data.id);

      // Create another project using API
      const otherProjectResponse = await apiCall(
        createProject,
        "POST",
        {},
        { name: `Other Test Project ${Date.now()}` },
      );
      expect(otherProjectResponse.status).toBe(201);
      const otherProjectId = otherProjectResponse.data.id;
      createdProjectIds.push(otherProjectId);

      // Create session for other project using API
      const response2 = await apiCall(
        POST,
        "POST",
        { projectId: otherProjectId },
        { title: "Other Session" },
      );
      expect(response2.status).toBe(200);
      createdSessionIds.push(response2.data.id);

      const response = await apiCall(GET, "GET", { projectId });

      expect(response.data.sessions).toHaveLength(1);
      expect(response.data.sessions[0].title).toBe("My Session");
    });
  });
});
