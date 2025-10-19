import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import "../../../../../../src/test/setup";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { POST as createProject } from "../../../route";
import { POST as createSession } from "../route";
import { POST as createTurn } from "./turns/route";
import { initServices } from "../../../../../../src/lib/init-services";
import { PROJECTS_TBL } from "../../../../../../src/db/schema/projects";
import {
  SESSIONS_TBL,
  TURNS_TBL,
  BLOCKS_TBL,
} from "../../../../../../src/db/schema/sessions";
import { eq } from "drizzle-orm";

// Mock Clerk authentication
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
const mockAuth = vi.mocked(auth);

describe("/api/projects/:projectId/sessions/:sessionId", () => {
  const projectId = `sess_detail-${Date.now()}`;
  const userId = `test-user-session-detail-${Date.now()}-${process.pid}`;
  let sessionId: string;
  let createdTurnIds: string[] = [];

  beforeEach(async () => {
    vi.clearAllMocks();
    // Mock successful authentication by default
    mockAuth.mockResolvedValue({ userId } as Awaited<ReturnType<typeof auth>>);

    // Initialize services
    initServices();

    // Clean up any existing test data
    await globalThis.services.db
      .delete(PROJECTS_TBL)
      .where(eq(PROJECTS_TBL.id, projectId));

    // Create test project using API
    const createProjectRequest = new NextRequest("http://localhost:3000", {
      method: "POST",
      body: JSON.stringify({ name: `Test Project ${Date.now()}` }),
    });
    const projectResponse = await createProject(createProjectRequest);
    expect(projectResponse.status).toBe(201);
    const projectData = await projectResponse.json();

    // Update the project with our test ID for consistency
    await globalThis.services.db
      .update(PROJECTS_TBL)
      .set({ id: projectId })
      .where(eq(PROJECTS_TBL.id, projectData.id));

    // Create test session using API
    const createSessionRequest = new NextRequest("http://localhost:3000", {
      method: "POST",
      body: JSON.stringify({ title: "Test Session" }),
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
      // Create turns using API
      const createTurn1Request = new NextRequest("http://localhost:3000", {
        method: "POST",
        body: JSON.stringify({ user_message: "First prompt" }),
      });
      const turnContext = { params: Promise.resolve({ projectId, sessionId }) };
      const turn1Response = await createTurn(createTurn1Request, turnContext);
      expect(turn1Response.status).toBe(200);
      const turn1Data = await turn1Response.json();
      createdTurnIds.push(turn1Data.id);

      const createTurn2Request = new NextRequest("http://localhost:3000", {
        method: "POST",
        body: JSON.stringify({ user_message: "Second prompt" }),
      });
      const turn2Response = await createTurn(createTurn2Request, turnContext);
      expect(turn2Response.status).toBe(200);
      const turn2Data = await turn2Response.json();
      createdTurnIds.push(turn2Data.id);

      const request = new NextRequest("http://localhost:3000");
      const context = { params: Promise.resolve({ projectId, sessionId }) };

      const response = await GET(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.turn_ids).toHaveLength(2);
      expect(data.turn_ids[0]).toBe(turn1Data.id);
      expect(data.turn_ids[1]).toBe(turn2Data.id);
    });

    it("should return valid ISO date strings for created_at and updated_at", async () => {
      const request = new NextRequest("http://localhost:3000");
      const context = { params: Promise.resolve({ projectId, sessionId }) };

      const response = await GET(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();

      // Verify created_at is a valid ISO string
      expect(typeof data.created_at).toBe("string");
      expect(data.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

      // Verify updated_at is a valid ISO string
      expect(typeof data.updated_at).toBe("string");
      expect(data.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

      // Verify dates can be parsed without getting Invalid Date
      const createdDate = new Date(data.created_at);
      const updatedDate = new Date(data.updated_at);

      expect(createdDate.toString()).not.toBe("Invalid Date");
      expect(updatedDate.toString()).not.toBe("Invalid Date");

      // Verify the parsed dates have valid timestamps
      expect(isNaN(createdDate.getTime())).toBe(false);
      expect(isNaN(updatedDate.getTime())).toBe(false);
    });
  });
});
