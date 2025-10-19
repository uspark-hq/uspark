import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import "../../../../../../../src/test/setup";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { POST as createProject } from "../../../../route";
import { POST as createSession } from "../../route";
import { POST as createTurn } from "../turns/route";
import { initServices } from "../../../../../../../src/lib/init-services";
import { PROJECTS_TBL } from "../../../../../../../src/db/schema/projects";
import {
  SESSIONS_TBL,
  TURNS_TBL,
} from "../../../../../../../src/db/schema/sessions";
import { eq } from "drizzle-orm";

// Mock Clerk authentication
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
const mockAuth = vi.mocked(auth);

describe("/api/projects/:projectId/sessions/:sessionId/interrupt", () => {
  let projectId: string;
  let sessionId: string;
  const userId = `test-user-interrupt-${Date.now()}-${process.pid}`;
  let createdTurnIds: string[] = [];

  beforeEach(async () => {
    vi.clearAllMocks();
    // Mock successful authentication by default
    mockAuth.mockResolvedValue({ userId } as Awaited<ReturnType<typeof auth>>);

    // Initialize services
    initServices();

    // Create test project using API
    const createProjectRequest = new NextRequest("http://localhost:3000", {
      method: "POST",
      body: JSON.stringify({ name: "Test Project for Interrupt" }),
    });
    const projectResponse = await createProject(createProjectRequest);
    expect(projectResponse.status).toBe(201);
    const projectData = await projectResponse.json();
    projectId = projectData.id;

    // Create test session using API
    const createSessionRequest = new NextRequest("http://localhost:3000", {
      method: "POST",
      body: JSON.stringify({ title: "Test Session for Interrupt" }),
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

  describe("POST /api/projects/:projectId/sessions/:sessionId/interrupt", () => {
    it("should mark running turn as interrupted", async () => {
      // Create running turn using API (this will use the correct "running" status)
      const createTurnRequest = new NextRequest("http://localhost:3000", {
        method: "POST",
        body: JSON.stringify({ user_message: "Running question" }),
      });
      const turnContext = { params: Promise.resolve({ projectId, sessionId }) };
      const turnResponse = await createTurn(createTurnRequest, turnContext);
      expect(turnResponse.status).toBe(200);
      const turnData = await turnResponse.json();
      createdTurnIds.push(turnData.id);

      // Create completed turn (using DB for non-running states since API doesn't support creating them)
      const [completedTurn] = await globalThis.services.db
        .insert(TURNS_TBL)
        .values({
          id: `turn_completed_${Date.now()}`,
          sessionId,
          userPrompt: "Completed question",
          status: "completed",
          completedAt: new Date(),
        })
        .returning();
      createdTurnIds.push(completedTurn!.id);

      const request = new NextRequest("http://localhost:3000", {
        method: "POST",
      });
      const context = { params: Promise.resolve({ projectId, sessionId }) };

      const response = await POST(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("id", sessionId);
      expect(data).toHaveProperty("status", "interrupted");

      // Verify running turn is now interrupted
      const [updatedTurn] = await globalThis.services.db
        .select()
        .from(TURNS_TBL)
        .where(eq(TURNS_TBL.id, turnData.id));

      expect(updatedTurn!.status).toBe("interrupted");
      expect(updatedTurn!.errorMessage).toBe("Session interrupted by user");
      expect(updatedTurn!.completedAt).not.toBeNull();

      // Verify completed turn is unchanged
      const [updatedCompleted] = await globalThis.services.db
        .select()
        .from(TURNS_TBL)
        .where(eq(TURNS_TBL.id, completedTurn!.id));

      expect(updatedCompleted!.status).toBe("completed");
      expect(updatedCompleted!.errorMessage).toBeNull();
    });

    it("should handle case when no running turns exist", async () => {
      // Create only completed turn
      const [completedTurn] = await globalThis.services.db
        .insert(TURNS_TBL)
        .values({
          id: `turn_completed_${Date.now()}`,
          sessionId,
          userPrompt: "Completed question",
          status: "completed",
          completedAt: new Date(),
        })
        .returning();

      createdTurnIds.push(completedTurn!.id);

      const request = new NextRequest("http://localhost:3000", {
        method: "POST",
      });
      const context = { params: Promise.resolve({ projectId, sessionId }) };

      const response = await POST(request, context);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("id", sessionId);
      expect(data).toHaveProperty("status", "interrupted");

      // Verify completed turn was not modified
      const [unchangedCompleted] = await globalThis.services.db
        .select()
        .from(TURNS_TBL)
        .where(eq(TURNS_TBL.id, completedTurn!.id));

      expect(unchangedCompleted!.status).toBe("completed");
      expect(unchangedCompleted!.errorMessage).toBeNull();
    });

    it("should not affect turns from other sessions", async () => {
      // Create running turn in test session using API
      const createTurnRequest = new NextRequest("http://localhost:3000", {
        method: "POST",
        body: JSON.stringify({ user_message: "Running in test session" }),
      });
      const turnContext = { params: Promise.resolve({ projectId, sessionId }) };
      const turnResponse = await createTurn(createTurnRequest, turnContext);
      expect(turnResponse.status).toBe(200);
      const turnData = await turnResponse.json();
      createdTurnIds.push(turnData.id);

      // Create another session with running turn using API
      const createOtherSessionRequest = new NextRequest(
        "http://localhost:3000",
        {
          method: "POST",
          body: JSON.stringify({ title: "Other Session" }),
        },
      );
      const otherSessionContext = { params: Promise.resolve({ projectId }) };
      const otherSessionResponse = await createSession(
        createOtherSessionRequest,
        otherSessionContext,
      );
      expect(otherSessionResponse.status).toBe(200);
      const otherSessionData = await otherSessionResponse.json();
      const otherSessionId = otherSessionData.id;

      // Create running turn in other session using API
      const createOtherTurnRequest = new NextRequest("http://localhost:3000", {
        method: "POST",
        body: JSON.stringify({ user_message: "Running in other session" }),
      });
      const otherTurnContext = {
        params: Promise.resolve({ projectId, sessionId: otherSessionId }),
      };
      const otherTurnResponse = await createTurn(
        createOtherTurnRequest,
        otherTurnContext,
      );
      expect(otherTurnResponse.status).toBe(200);
      const otherTurnData = await otherTurnResponse.json();

      const request = new NextRequest("http://localhost:3000", {
        method: "POST",
      });
      const context = { params: Promise.resolve({ projectId, sessionId }) };

      await POST(request, context);

      // Verify test session turn was interrupted
      const [updatedTurn] = await globalThis.services.db
        .select()
        .from(TURNS_TBL)
        .where(eq(TURNS_TBL.id, turnData.id));

      expect(updatedTurn!.status).toBe("interrupted");
      expect(updatedTurn!.errorMessage).toBe("Session interrupted by user");

      // Verify other session turn was not affected
      const [otherTurn] = await globalThis.services.db
        .select()
        .from(TURNS_TBL)
        .where(eq(TURNS_TBL.id, otherTurnData.id));

      expect(otherTurn!.status).toBe("running");
      expect(otherTurn!.errorMessage).toBeNull();
      expect(otherTurn!.completedAt).toBeNull();

      // Clean up
      await globalThis.services.db
        .delete(TURNS_TBL)
        .where(eq(TURNS_TBL.id, otherTurnData.id));
      await globalThis.services.db
        .delete(SESSIONS_TBL)
        .where(eq(SESSIONS_TBL.id, otherSessionId));
    });
  });
});
