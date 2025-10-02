import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import "../../../../../src/test/setup";
import { apiCall, apiCallWithQuery } from "../../../../../src/test/api-helpers";
import { POST as createSession, GET as listSessions } from "./route";
import { GET as getSession } from "./[sessionId]/route";
import {
  POST as createTurn,
  GET as listTurns,
} from "./[sessionId]/turns/route";
import { GET as getTurn } from "./[sessionId]/turns/[turnId]/route";
import { POST as interruptSession } from "./[sessionId]/interrupt/route";
import { GET as getUpdates } from "./[sessionId]/updates/route";
import { POST as createProject } from "../../route";
import { initServices } from "../../../../../src/lib/init-services";
import { CLAUDE_TOKENS_TBL } from "../../../../../src/db/schema/claude-tokens";

// Mock Clerk authentication
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

// Mock ClaudeExecutor to prevent actual execution during tests
vi.mock("../../../../../src/lib/claude-executor", () => ({
  ClaudeExecutor: {
    execute: vi.fn().mockResolvedValue(undefined),
    interrupt: vi.fn().mockResolvedValue(undefined),
  },
}));

import { auth } from "@clerk/nextjs/server";
const mockAuth = vi.mocked(auth);

/**
 * API-based integration tests for Claude session management
 * These tests use API endpoints to set up test data rather than direct database access
 */
describe("Claude Session Management API Integration", () => {
  const userId = `test-user-api-${Date.now()}-${process.pid}`;
  let projectId: string;
  let sessionId: string;
  let turnId: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Mock successful authentication
    mockAuth.mockResolvedValue({ userId } as Awaited<ReturnType<typeof auth>>);

    // Initialize services and add Claude token for test user
    initServices();
    await globalThis.services.db
      .insert(CLAUDE_TOKENS_TBL)
      .values({
        userId,
        encryptedToken: "encrypted_test_token",
        tokenPrefix: "test_token",
      })
      .onConflictDoUpdate({
        target: CLAUDE_TOKENS_TBL.userId,
        set: {
          encryptedToken: "encrypted_test_token",
          tokenPrefix: "test_token",
        },
      });

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
    // Cleanup is handled by database migrations/test setup
  });

  describe("Session Lifecycle", () => {
    it("should create and retrieve a session through API calls", async () => {
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
    });
  });

  describe("Turn Management", () => {
    beforeEach(async () => {
      vi.clearAllMocks();
      // Create a session for turn tests
      const sessionResponse = await apiCall(
        createSession,
        "POST",
        { projectId },
        { title: "Turn Test Session" },
      );
      sessionId = sessionResponse.data.id;
    });

    it("should create and retrieve turns through API calls", async () => {
      // 1. Create a turn
      const turnResponse = await apiCall(
        createTurn,
        "POST",
        { projectId, sessionId },
        { user_message: "Test prompt" },
      );

      expect(turnResponse.status).toBe(200);
      expect(turnResponse.data).toHaveProperty("id");
      expect(turnResponse.data.user_message).toBe("Test prompt");
      expect(turnResponse.data.status).toBe("pending");
      turnId = turnResponse.data.id;

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
      expect(getResponse.data.user_prompt).toBe("Test prompt");
      // No blocks expected since ClaudeExecutor is mocked
      expect(Array.isArray(getResponse.data.blocks)).toBe(true);
      expect(getResponse.data.blocks.length).toBe(0);
    });

    it("should support pagination for turns", async () => {
      // Create multiple turns
      for (let i = 0; i < 5; i++) {
        await apiCall(
          createTurn,
          "POST",
          { projectId, sessionId },
          { user_message: `Prompt ${i}` },
        );
      }

      // Test pagination
      const page1 = await apiCallWithQuery(
        listTurns,
        { projectId, sessionId },
        { limit: "2", offset: "0" },
      );

      expect(page1.status).toBe(200);
      expect(page1.data.turns).toHaveLength(2);
      expect(page1.data.total).toBeGreaterThanOrEqual(5);

      const page2 = await apiCallWithQuery(
        listTurns,
        { projectId, sessionId },
        { limit: "2", offset: "2" },
      );

      expect(page2.data.turns).toHaveLength(2);
      expect(page2.data.turns[0].user_prompt).not.toBe(
        page1.data.turns[0].user_prompt,
      );
    });
  });

  describe("Session Interruption", () => {
    beforeEach(async () => {
      vi.clearAllMocks();
      const sessionResponse = await apiCall(
        createSession,
        "POST",
        { projectId },
        { title: "Interrupt Test Session" },
      );
      sessionId = sessionResponse.data.id;
    });

    it("should handle interruption of empty session", async () => {
      const interruptResponse = await apiCall(
        interruptSession,
        "POST",
        { projectId, sessionId },
        {},
      );

      expect(interruptResponse.status).toBe(200);
      expect(interruptResponse.data.id).toBe(sessionId);
      expect(interruptResponse.data.status).toBe("interrupted");
    });
  });

  describe("Polling Updates", () => {
    beforeEach(async () => {
      vi.clearAllMocks();
      const sessionResponse = await apiCall(
        createSession,
        "POST",
        { projectId },
        { title: "Polling Test Session" },
      );
      sessionId = sessionResponse.data.id;
    });

    it("should detect new turns through polling API", async () => {
      // Initial state - no turns
      const initialState = await apiCallWithQuery(
        getUpdates,
        { projectId, sessionId },
        { timeout: "0" },
      );

      // Should return 204 No Content when no blocks exist
      expect(initialState.status).toBe(204);

      // Create a turn (ClaudeExecutor is mocked, so no blocks will be created)
      await apiCall(
        createTurn,
        "POST",
        { projectId, sessionId },
        { user_message: "New message" },
      );

      // Poll for updates without lastBlockId - should still return 204 since no blocks
      // (Turn exists but ClaudeExecutor is mocked so no blocks are created)
      const updates = await apiCallWithQuery(
        getUpdates,
        { projectId, sessionId },
        { timeout: "0" },
      );

      // Since ClaudeExecutor is mocked and doesn't create blocks, return is 204
      expect(updates.status).toBe(204);
    });
  });

  describe("Error Handling", () => {
    it("should handle authentication errors", async () => {
      mockAuth.mockResolvedValueOnce({ userId: null } as Awaited<
        ReturnType<typeof auth>
      >);

      const response = await apiCall(
        createSession,
        "POST",
        { projectId },
        { title: "Should fail" },
      );

      expect(response.status).toBe(401);
      expect(response.data).toHaveProperty("error");
    });

    it("should handle non-existent resources", async () => {
      const response = await apiCall(getSession, "GET", {
        projectId: "404e4567-e89b-12d3-a456-426614174404",
        sessionId: "sess_nonexistent",
      });

      expect(response.status).toBe(404);
      expect(response.data).toHaveProperty("error");
    });

    it("should handle invalid input", async () => {
      // Need to create a valid session first
      const sessionResponse = await apiCall(
        createSession,
        "POST",
        { projectId },
        { title: "Test Session" },
      );
      const validSessionId = sessionResponse.data.id;

      const response = await apiCall(
        createTurn,
        "POST",
        { projectId, sessionId: validSessionId },
        { user_message: "" }, // Empty message should be invalid
      );

      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty("error");
    });
  });
});
