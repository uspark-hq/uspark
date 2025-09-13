import { describe, it, expect, beforeEach, vi } from "vitest";
import "../../../src/test/setup";
import { GET, POST } from "./route";
import { apiCall } from "../../../src/test/api-helpers";
import { initServices } from "../../../src/lib/init-services";
import { PROJECTS_TBL } from "../../../src/db/schema/projects";
import { eq } from "drizzle-orm";
import * as Y from "yjs";

// Mock Clerk authentication
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
const mockAuth = vi.mocked(auth);

describe("/api/projects", () => {
  const userId = `test-user-projects-${Date.now()}-${process.pid}`;
  const createdProjectIds: string[] = [];

  beforeEach(async () => {
    vi.clearAllMocks();
    // Mock successful authentication by default
    mockAuth.mockResolvedValue({ userId } as Awaited<ReturnType<typeof auth>>);
    
    // Clean up any projects created in previous tests
    // Note: Since we don't have a DELETE endpoint yet, we'll track created projects
    // and rely on test isolation. In production tests, you'd want a proper cleanup API.
    createdProjectIds.length = 0;
  });

  describe("GET /api/projects", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValueOnce({ userId: null } as Awaited<
        ReturnType<typeof auth>
      >);

      const response = await apiCall(GET, "GET");

      expect(response.status).toBe(401);
      expect(response.data).toHaveProperty("error", "unauthorized");
    });

    it("should return empty list when user has no projects", async () => {
      const response = await apiCall(GET, "GET");

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("projects");
      expect(response.data.projects).toEqual([]);
    });

    it("should return user's projects list", async () => {
      // Create test projects using API endpoint
      const response1 = await apiCall(
        POST,
        "POST",
        {},
        { name: `test-project-1-${Date.now()}` }
      );
      expect(response1.status).toBe(201);
      const project1 = response1.data;
      createdProjectIds.push(project1.id);

      const response2 = await apiCall(
        POST,
        "POST",
        {},
        { name: `test-project-2-${Date.now()}` }
      );
      expect(response2.status).toBe(201);
      const project2 = response2.data;
      createdProjectIds.push(project2.id);

      const response = await apiCall(GET, "GET");

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("projects");
      expect(response.data.projects).toHaveLength(2);

      // Check project structure
      expect(response.data.projects[0]).toHaveProperty("id");
      expect(response.data.projects[0]).toHaveProperty("name");
      expect(response.data.projects[0]).toHaveProperty("created_at");
      expect(response.data.projects[0]).toHaveProperty("updated_at");

      // Check that we got our test projects
      const projectIds = response.data.projects.map((p: { id: string }) => p.id);
      expect(projectIds).toContain(project1.id);
      expect(projectIds).toContain(project2.id);
    });

    it("should only return projects for the correct user", async () => {
      // Create project for different user - need to use direct DB here
      // as API would create project for current authenticated user
      initServices();
      const otherUserId = "other-user";
      const otherProjectId = `other-project-${Date.now()}`;

      const ydoc = new Y.Doc();
      const state = Y.encodeStateAsUpdate(ydoc);
      const base64Data = Buffer.from(state).toString("base64");

      await globalThis.services.db.insert(PROJECTS_TBL).values({
        id: otherProjectId,
        userId: otherUserId,
        ydocData: base64Data,
        version: 0,
      });

      const response = await apiCall(GET, "GET");

      expect(response.status).toBe(200);
      
      // Should not contain the other user's project
      const projectIds = response.data.projects.map((p: { id: string }) => p.id);
      expect(projectIds).not.toContain(otherProjectId);
      
      // Should only contain projects created by the current user
      response.data.projects.forEach((project: { id: string }) => {
        // All projects should be from the current user (created in previous tests)
        expect(createdProjectIds.includes(project.id) || project.id.startsWith("proj_")).toBe(true);
      });
      
      // Clean up
      await globalThis.services.db
        .delete(PROJECTS_TBL)
        .where(eq(PROJECTS_TBL.id, otherProjectId));
    });
  });

  describe("POST /api/projects", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValueOnce({ userId: null } as Awaited<
        ReturnType<typeof auth>
      >);

      const response = await apiCall(
        POST,
        "POST",
        {},
        { name: "test-project" }
      );

      expect(response.status).toBe(401);
      expect(response.data).toHaveProperty("error", "unauthorized");
    });

    it("should create a new project successfully", async () => {
      const projectName = `test-project-${Date.now()}`;

      const response = await apiCall(
        POST,
        "POST",
        {},
        { name: projectName }
      );

      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty("id");
      expect(response.data).toHaveProperty("name");
      expect(response.data).toHaveProperty("created_at");
      expect(response.data.id).toMatch(
        /^proj_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      ); // UUID format
      expect(response.data.name).toBe(response.data.id); // Currently using ID as name
      
      createdProjectIds.push(response.data.id);

      // Verify project is accessible via GET
      const getResponse = await apiCall(GET, "GET");
      expect(getResponse.status).toBe(200);
      const projectIds = getResponse.data.projects.map((p: { id: string }) => p.id);
      expect(projectIds).toContain(response.data.id);
    });

    it("should validate request body with schema", async () => {
      const response = await apiCall(
        POST,
        "POST",
        {},
        {} // Missing name
      );

      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty("error", "invalid_request");
      expect(response.data).toHaveProperty("error_description");
    });

    it("should reject empty name", async () => {
      const response = await apiCall(
        POST,
        "POST",
        {},
        { name: "" }
      );

      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty("error", "invalid_request");
      expect(response.data.error_description).toContain("Project name is required");
    });

    it("should reject name that is too long", async () => {
      const longName = "a".repeat(101); // Exceeds 100 char limit

      const response = await apiCall(
        POST,
        "POST",
        {},
        { name: longName }
      );

      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty("error", "invalid_request");
      expect(response.data.error_description).toContain(
        "Project name must be under 100 characters",
      );
    });

    it("should reject non-string name", async () => {
      const response = await apiCall(
        POST,
        "POST",
        {},
        { name: 123 }
      );

      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty("error", "invalid_request");
      expect(response.data.error_description).toContain(
        "expected string, received number",
      );
    });

    it("should handle invalid JSON", async () => {
      // Use NextRequest directly to send invalid JSON
      const { NextRequest } = await import("next/server");
      const mockRequest = new NextRequest("http://localhost:3000", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: "invalid json",
      });

      // This should throw an error which will be handled by Next.js error boundaries
      await expect(POST(mockRequest)).rejects.toThrow();
    });

    it("should generate unique project IDs", async () => {
      const projectName = "duplicate-name";

      // Create first project
      const response1 = await apiCall(
        POST,
        "POST",
        {},
        { name: projectName }
      );
      expect(response1.status).toBe(201);
      createdProjectIds.push(response1.data.id);

      // Create second project with same name
      const response2 = await apiCall(
        POST,
        "POST",
        {},
        { name: projectName }
      );
      expect(response2.status).toBe(201);
      createdProjectIds.push(response2.data.id);

      // IDs should be different even with same name
      expect(response1.data.id).not.toBe(response2.data.id);
      // Both should follow the proj_<uuid> format
      expect(response1.data.id).toMatch(
        /^proj_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(response2.data.id).toMatch(
        /^proj_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });
  });
});
