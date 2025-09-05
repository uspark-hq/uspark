import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";
import * as Y from "yjs";
import { initServices } from "../../../src/lib/init-services";
import { PROJECTS_TBL } from "../../../src/db/schema/projects";
import { SHARE_LINKS_TBL } from "../../../src/db/schema/share-links";
import { eq } from "drizzle-orm";

// Mock Clerk authentication
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
const mockAuth = vi.mocked(auth);

describe("/api/projects", () => {
  // Generate unique userId for each test to ensure complete isolation
  let userId: string;

  beforeEach(async () => {
    // Create a unique user ID for this specific test
    userId = `projects-test-user-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    // Mock successful authentication with the unique userId
    mockAuth.mockResolvedValue({ userId } as Awaited<ReturnType<typeof auth>>);

    // Initialize services
    initServices();

    // No need to clean up since each test uses a unique userId
    // This ensures complete test isolation
  });

  afterEach(async () => {
    // Clean up data created by this specific test
    if (userId && globalThis.services?.db) {
      // Delete all share links for this test's user
      await globalThis.services.db
        .delete(SHARE_LINKS_TBL)
        .where(eq(SHARE_LINKS_TBL.userId, userId));

      // Delete all projects for this test's user
      await globalThis.services.db
        .delete(PROJECTS_TBL)
        .where(eq(PROJECTS_TBL.userId, userId));
    }
  });

  describe("GET /api/projects", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValueOnce({ userId: null } as Awaited<
        ReturnType<typeof auth>
      >);

      const response = await GET();

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty("error", "unauthorized");
    });

    it("should return empty list when user has no projects", async () => {
      const response = await GET();

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("projects");
      expect(data.projects).toEqual([]);
    });

    it("should return user's projects list", async () => {
      // Create test projects
      const project1Id = `test-project-1-${Date.now()}`;
      const project2Id = `test-project-2-${Date.now()}`;

      const ydoc = new Y.Doc();
      const state = Y.encodeStateAsUpdate(ydoc);
      const base64Data = Buffer.from(state).toString("base64");

      await globalThis.services.db.insert(PROJECTS_TBL).values([
        {
          id: project1Id,
          userId,
          ydocData: base64Data,
          version: 0,
        },
        {
          id: project2Id,
          userId,
          ydocData: base64Data,
          version: 0,
        },
      ]);

      const response = await GET();

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("projects");
      expect(data.projects).toHaveLength(2);

      // Check project structure
      expect(data.projects[0]).toHaveProperty("id");
      expect(data.projects[0]).toHaveProperty("name");
      expect(data.projects[0]).toHaveProperty("created_at");
      expect(data.projects[0]).toHaveProperty("updated_at");

      // Check that we got our test projects
      const projectIds = data.projects.map((p: { id: string }) => p.id);
      expect(projectIds).toContain(project1Id);
      expect(projectIds).toContain(project2Id);
    });

    it("should only return projects for the correct user", async () => {
      // Create project for different user with unique ID
      const otherUserId = `other-user-${Date.now()}-${Math.random().toString(36).substring(7)}`;
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

      const response = await GET();

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.projects).toEqual([]);
      
      // Clean up the other user's project
      await globalThis.services.db
        .delete(PROJECTS_TBL)
        .where(eq(PROJECTS_TBL.userId, otherUserId));
    });
  });

  describe("POST /api/projects", () => {
    it("should return 401 when not authenticated", async () => {
      mockAuth.mockResolvedValueOnce({ userId: null } as Awaited<
        ReturnType<typeof auth>
      >);

      const mockRequest = new NextRequest("http://localhost:3000", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "test-project" }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty("error", "unauthorized");
    });

    it("should create a new project successfully", async () => {
      const projectName = `test-project-${Date.now()}`;

      const mockRequest = new NextRequest("http://localhost:3000", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: projectName }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(201);
      const data = await response.json();

      expect(data).toHaveProperty("id");
      expect(data).toHaveProperty("name");
      expect(data).toHaveProperty("created_at");
      expect(data.id).toContain(projectName);
      expect(data.name).toBe(data.id); // Currently using ID as name

      // Verify project was created in database
      const [storedProject] = await globalThis.services.db
        .select()
        .from(PROJECTS_TBL)
        .where(eq(PROJECTS_TBL.id, data.id));

      expect(storedProject).toBeDefined();
      expect(storedProject?.userId).toBe(userId);
      expect(storedProject?.version).toBe(0);

      // Verify YDoc was initialized correctly
      const ydoc = new Y.Doc();
      const storedBinary = Buffer.from(storedProject?.ydocData || "", "base64");
      Y.applyUpdate(ydoc, new Uint8Array(storedBinary));

      const files = ydoc.getMap("files");
      expect(files.size).toBe(0); // Should start empty
    });

    it("should validate request body with schema", async () => {
      const mockRequest = new NextRequest("http://localhost:3000", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}), // Missing name
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty("error", "invalid_request");
      expect(data).toHaveProperty("error_description");
    });

    it("should reject empty name", async () => {
      const mockRequest = new NextRequest("http://localhost:3000", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "" }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty("error", "invalid_request");
      expect(data.error_description).toContain("Project name is required");
    });

    it("should reject name that is too long", async () => {
      const longName = "a".repeat(101); // Exceeds 100 char limit

      const mockRequest = new NextRequest("http://localhost:3000", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: longName }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty("error", "invalid_request");
      expect(data.error_description).toContain(
        "Project name must be under 100 characters",
      );
    });

    it("should reject non-string name", async () => {
      const mockRequest = new NextRequest("http://localhost:3000", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: 123 }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty("error", "invalid_request");
      expect(data.error_description).toContain(
        "expected string, received number",
      );
    });

    it("should handle invalid JSON", async () => {
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
      const request1 = new NextRequest("http://localhost:3000", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: projectName }),
      });

      const response1 = await POST(request1);
      expect(response1.status).toBe(201);
      const data1 = await response1.json();

      // Create second project with same name
      const request2 = new NextRequest("http://localhost:3000", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: projectName }),
      });

      const response2 = await POST(request2);
      expect(response2.status).toBe(201);
      const data2 = await response2.json();

      // IDs should be different
      expect(data1.id).not.toBe(data2.id);
      expect(data1.id).toContain(projectName);
      expect(data2.id).toContain(projectName);
    });
  });
});
