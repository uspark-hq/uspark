import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { apiCall, apiCallWithQuery } from "@/test/api-helpers";
import { POST as createSession, GET as listSessions } from "./route";
import { GET as getSession, PATCH as updateSession } from "./[sessionId]/route";
import {
  POST as createTurn,
  GET as listTurns,
} from "./[sessionId]/turns/route";
import {
  GET as getTurn,
  PATCH as updateTurn,
} from "./[sessionId]/turns/[turnId]/route";
import { POST as interruptSession } from "./[sessionId]/interrupt/route";
import { GET as getUpdates } from "./[sessionId]/updates/route";
import { POST as createProject } from "../../route";

// Mock Clerk authentication
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";
const mockAuth = vi.mocked(auth);

/**
 * API-based integration tests for Claude session management
 * These tests use API endpoints to set up test data rather than direct database access
 */
describe("Claude Session Management API Integration", () => {
  const userId = "test-user-api";
  let projectId: string;
  let sessionId: string;
  let turnId: string;

  beforeEach(async () => {
    // Mock successful authentication
    mockAuth.mockResolvedValue({ userId } as Awaited<ReturnType<typeof auth>>);

    // Create a project using the API
    const projectResponse = await apiCall(
      createProject,
      "POST",
      {},
      { name: "Test Project" },
    );
    expect(projectResponse.status).toBe(201);
    projectId = projectResponse.data.id;
  });

  afterEach(async () => {
    // Clean up is handled by test database cleanup
    // In production, you might want to delete via API endpoints
  });

  describe("Session Lifecycle", () => {
    it("should create and manage a session through API calls", async () => {
      // 1. Create a session
      const createResponse = await apiCall(
        createSession,
        "POST",
        { projectId },
        { title: "Test Session via API" },
      );

      expect(createResponse.status).toBe(200);
      expect(createResponse.data).toHaveProperty("id");
      expect(createResponse.data.title).toBe("Test Session via API");
      sessionId = createResponse.data.id;

      // 2. List sessions
      const listResponse = await apiCall(listSessions, "GET", { projectId });

      expect(listResponse.status).toBe(200);
      expect(listResponse.data.sessions).toHaveLength(1);
      expect(listResponse.data.sessions[0].id).toBe(sessionId);

      // 3. Get session details
      const getResponse = await apiCall(getSession, "GET", {
        projectId,
        sessionId,
      });

      expect(getResponse.status).toBe(200);
      expect(getResponse.data.id).toBe(sessionId);
      expect(getResponse.data.turn_ids).toEqual([]);

      // 4. Update session
      const updateResponse = await apiCall(
        updateSession,
        "PATCH",
        { projectId, sessionId },
        { title: "Updated Title" },
      );

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.data.title).toBe("Updated Title");
    });
  });

  describe("Turn Management", () => {
    beforeEach(async () => {
      // Create a session for turn tests
      const response = await apiCall(
        createSession,
        "POST",
        { projectId },
        { title: "Session for Turns" },
      );
      sessionId = response.data.id;
    });

    it("should create and manage turns through API calls", async () => {
      // 1. Create a turn
      const createResponse = await apiCall(
        createTurn,
        "POST",
        { projectId, sessionId },
        { user_message: "Hello, Claude!" },
      );

      expect(createResponse.status).toBe(200);
      expect(createResponse.data).toHaveProperty("id");
      expect(createResponse.data.user_message).toBe("Hello, Claude!");
      expect(createResponse.data.status).toBe("pending");
      turnId = createResponse.data.id;

      // 2. List turns
      const listResponse = await apiCall(listTurns, "GET", {
        projectId,
        sessionId,
      });

      expect(listResponse.status).toBe(200);
      expect(listResponse.data.turns).toHaveLength(1);
      expect(listResponse.data.turns[0].id).toBe(turnId);

      // 3. Get turn details
      const getResponse = await apiCall(getTurn, "GET", {
        projectId,
        sessionId,
        turnId,
      });

      expect(getResponse.status).toBe(200);
      expect(getResponse.data.id).toBe(turnId);
      expect(getResponse.data.blocks).toEqual([]);

      // 4. Update turn status
      const updateResponse = await apiCall(
        updateTurn,
        "PATCH",
        { projectId, sessionId, turnId },
        { status: "running" },
      );

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.data.status).toBe("running");
      expect(updateResponse.data.started_at).not.toBeNull();

      // 5. Complete the turn
      const completeResponse = await apiCall(
        updateTurn,
        "PATCH",
        { projectId, sessionId, turnId },
        { status: "completed" },
      );

      expect(completeResponse.status).toBe(200);
      expect(completeResponse.data.status).toBe("completed");
      expect(completeResponse.data.completed_at).not.toBeNull();
    });

    it("should handle turn errors through API", async () => {
      // Create a turn
      const createResponse = await apiCall(
        createTurn,
        "POST",
        { projectId, sessionId },
        { user_message: "This will fail" },
      );
      turnId = createResponse.data.id;

      // Mark as failed with error message
      const failResponse = await apiCall(
        updateTurn,
        "PATCH",
        { projectId, sessionId, turnId },
        {
          status: "failed",
          error_message: "API rate limit exceeded",
        },
      );

      expect(failResponse.status).toBe(200);
      expect(failResponse.data.status).toBe("failed");
      expect(failResponse.data.error_message).toBe("API rate limit exceeded");
    });
  });

  describe("Session Interruption", () => {
    beforeEach(async () => {
      // Create session and turns
      const sessionResponse = await apiCall(
        createSession,
        "POST",
        { projectId },
        { title: "Session to Interrupt" },
      );
      sessionId = sessionResponse.data.id;

      // Create multiple turns with different statuses
      const turn1Response = await apiCall(
        createTurn,
        "POST",
        { projectId, sessionId },
        { user_message: "First message" },
      );

      // Set first turn to running
      await apiCall(
        updateTurn,
        "PATCH",
        { projectId, sessionId, turnId: turn1Response.data.id },
        { status: "running" },
      );

      const turn2Response = await apiCall(
        createTurn,
        "POST",
        { projectId, sessionId },
        { user_message: "Second message" },
      );

      // Set second turn to running
      await apiCall(
        updateTurn,
        "PATCH",
        { projectId, sessionId, turnId: turn2Response.data.id },
        { status: "running" },
      );

      // Create a completed turn
      const turn3Response = await apiCall(
        createTurn,
        "POST",
        { projectId, sessionId },
        { user_message: "Completed message" },
      );

      await apiCall(
        updateTurn,
        "PATCH",
        { projectId, sessionId, turnId: turn3Response.data.id },
        { status: "completed" },
      );
    });

    it("should interrupt running turns through API", async () => {
      // Interrupt the session
      const interruptResponse = await apiCall(interruptSession, "POST", {
        projectId,
        sessionId,
      });

      expect(interruptResponse.status).toBe(200);
      expect(interruptResponse.data.status).toBe("interrupted");

      // Verify turns status
      const turnsResponse = await apiCall(listTurns, "GET", {
        projectId,
        sessionId,
      });

      const turns = turnsResponse.data.turns;

      // Running turns should be failed
      const failedTurns = turns.filter(
        (t: { user_prompt: string }) =>
          t.user_prompt === "First message" ||
          t.user_prompt === "Second message",
      );
      failedTurns.forEach((turn: { status: string }) => {
        expect(turn.status).toBe("failed");
      });

      // Completed turn should remain completed
      const completedTurn = turns.find(
        (t: { user_prompt: string }) => t.user_prompt === "Completed message",
      );
      expect(completedTurn!.status).toBe("completed");
    });
  });

  describe("Polling Updates", () => {
    beforeEach(async () => {
      const sessionResponse = await apiCall(
        createSession,
        "POST",
        { projectId },
        { title: "Session for Polling" },
      );
      sessionId = sessionResponse.data.id;
    });

    it("should detect new turns through polling API", async () => {
      // Initial state - no turns
      const initial = await apiCall(getUpdates, "GET", {
        projectId,
        sessionId,
      });

      expect(initial.data.new_turn_ids).toEqual([]);
      expect(initial.data.has_active_turns).toBe(false);

      // Create a turn
      const turnResponse = await apiCall(
        createTurn,
        "POST",
        { projectId, sessionId },
        { user_message: "New message" },
      );

      // Poll for updates (client hasn't seen any turns)
      const updates = await apiCall(getUpdates, "GET", {
        projectId,
        sessionId,
      });

      expect(updates.data.new_turn_ids).toContain(turnResponse.data.id);
      expect(updates.data.has_active_turns).toBe(true);

      // Set turn to running
      await apiCall(
        updateTurn,
        "PATCH",
        { projectId, sessionId, turnId: turnResponse.data.id },
        { status: "running" },
      );

      // Poll again (client has seen the turn at index 0)
      const updates2 = await apiCallWithQuery(
        getUpdates,
        { projectId, sessionId },
        { last_turn_index: "0" },
      );

      expect(updates2.data.new_turn_ids).toEqual([]);
      expect(updates2.data.has_active_turns).toBe(true);
    });
  });

  describe("End-to-End Conversation Flow", () => {
    it("should handle a complete conversation flow through APIs", async () => {
      // 1. Create session
      const sessionResponse = await apiCall(
        createSession,
        "POST",
        { projectId },
        { title: "Complete Conversation" },
      );
      sessionId = sessionResponse.data.id;

      // 2. User sends first message
      const turn1Response = await apiCall(
        createTurn,
        "POST",
        { projectId, sessionId },
        { user_message: "What is the weather today?" },
      );
      const turn1Id = turn1Response.data.id;

      // 3. System starts processing
      await apiCall(
        updateTurn,
        "PATCH",
        { projectId, sessionId, turnId: turn1Id },
        { status: "running" },
      );

      // 4. System completes response
      await apiCall(
        updateTurn,
        "PATCH",
        { projectId, sessionId, turnId: turn1Id },
        { status: "completed" },
      );

      // 5. User sends follow-up
      const turn2Response = await apiCall(
        createTurn,
        "POST",
        { projectId, sessionId },
        { user_message: "What about tomorrow?" },
      );
      const turn2Id = turn2Response.data.id;

      // 6. Process second turn
      await apiCall(
        updateTurn,
        "PATCH",
        { projectId, sessionId, turnId: turn2Id },
        { status: "running" },
      );

      await apiCall(
        updateTurn,
        "PATCH",
        { projectId, sessionId, turnId: turn2Id },
        { status: "completed" },
      );

      // 7. Verify conversation history
      const sessionDetails = await apiCall(getSession, "GET", {
        projectId,
        sessionId,
      });

      expect(sessionDetails.data.turn_ids).toHaveLength(2);

      const turnsHistory = await apiCall(listTurns, "GET", {
        projectId,
        sessionId,
      });

      expect(turnsHistory.data.turns).toHaveLength(2);
      expect(turnsHistory.data.turns[0].status).toBe("completed");
      expect(turnsHistory.data.turns[1].status).toBe("completed");
    });
  });

  describe("Error Handling", () => {
    it("should handle authentication errors", async () => {
      // Mock failed authentication
      mockAuth.mockResolvedValueOnce({ userId: null } as Awaited<
        ReturnType<typeof auth>
      >);

      const response = await apiCall(
        createSession,
        "POST",
        { projectId },
        { title: "Unauthorized" },
      );

      expect(response.status).toBe(401);
      expect(response.data.error).toBe("unauthorized");
    });

    it("should handle non-existent resources", async () => {
      const response = await apiCall(getSession, "GET", {
        projectId: "non-existent",
        sessionId: "non-existent",
      });

      expect(response.status).toBe(404);
      expect(response.data.error).toBe("project_not_found");
    });

    it("should handle invalid input", async () => {
      const sessionResponse = await apiCall(
        createSession,
        "POST",
        { projectId },
        { title: "Session for Invalid Input" },
      );
      sessionId = sessionResponse.data.id;

      // Try to create turn without user_message
      const response = await apiCall(
        createTurn,
        "POST",
        { projectId, sessionId },
        {},
      );

      expect(response.status).toBe(400);
      expect(response.data.error).toBe("user_message_required");
    });
  });
});
