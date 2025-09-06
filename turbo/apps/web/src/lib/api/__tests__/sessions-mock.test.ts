import { describe, it, expect } from "vitest";
import {
  generateMockBlock,
  generateMockTurn,
  generateMockSession,
  createSessionSimulator,
  MockSessionApiClient,
} from "../sessions-mock";

describe("Mock Data Generators", () => {
  describe("generateMockBlock", () => {
    it("should generate a block with default content", () => {
      const block = generateMockBlock("turn-123", "content");
      
      expect(block).toMatchObject({
        turnId: "turn-123",
        type: "content",
        content: expect.stringContaining("Mock content block"),
        createdAt: expect.any(String),
      });
      expect(block.id).toMatch(/^block-/);
    });

    it("should generate a block with custom content", () => {
      const block = generateMockBlock("turn-123", "thinking", "Custom thinking...");
      
      expect(block).toMatchObject({
        turnId: "turn-123",
        type: "thinking",
        content: "Custom thinking...",
      });
    });

    it("should include metadata for tool_use blocks", () => {
      const block = generateMockBlock("turn-123", "tool_use");
      
      expect(block.metadata).toEqual({ tool: "example_tool" });
    });

    it("should not include metadata for other block types", () => {
      const contentBlock = generateMockBlock("turn-123", "content");
      const thinkingBlock = generateMockBlock("turn-123", "thinking");
      const errorBlock = generateMockBlock("turn-123", "error");
      
      expect(contentBlock.metadata).toBeUndefined();
      expect(thinkingBlock.metadata).toBeUndefined();
      expect(errorBlock.metadata).toBeUndefined();
    });
  });

  describe("generateMockTurn", () => {
    it("should generate a turn with specified block count", () => {
      const turn = generateMockTurn("session-123", "running", 3);
      
      expect(turn).toMatchObject({
        sessionId: "session-123",
        status: "running",
        userMessage: expect.stringContaining("Sample user message"),
        blocks: expect.arrayContaining([
          expect.objectContaining({ type: "thinking" }),
          expect.objectContaining({ type: "tool_use" }),
          expect.objectContaining({ type: "content" }),
        ]),
      });
      expect(turn.blocks).toHaveLength(3);
    });

    it("should generate empty turn when blockCount is 0", () => {
      const turn = generateMockTurn("session-123", "completed", 0);
      
      expect(turn.blocks).toHaveLength(0);
    });

    it("should generate progressive blocks based on count", () => {
      const turn1 = generateMockTurn("session-123", "running", 1);
      const turn2 = generateMockTurn("session-123", "running", 2);
      
      expect(turn1.blocks).toHaveLength(1);
      expect(turn1.blocks[0]?.type).toBe("thinking");
      
      expect(turn2.blocks).toHaveLength(2);
      expect(turn2.blocks[0]?.type).toBe("thinking");
      expect(turn2.blocks[1]?.type).toBe("tool_use");
    });

    it("should generate unique IDs", () => {
      const turn1 = generateMockTurn("session-123", "running");
      const turn2 = generateMockTurn("session-123", "running");
      
      expect(turn1.id).not.toBe(turn2.id);
      expect(turn1.userMessage).not.toBe(turn2.userMessage);
    });
  });

  describe("generateMockSession", () => {
    it("should generate session with specified turn count", () => {
      const session = generateMockSession("project-456", "running", 3);
      
      expect(session).toMatchObject({
        projectId: "project-456",
        status: "running",
        turns: expect.any(Array),
      });
      expect(session.turns).toHaveLength(3);
    });

    it("should set last turn as running when session is running", () => {
      const session = generateMockSession("project-456", "running", 2);
      
      expect(session.turns[0]?.status).toBe("completed");
      expect(session.turns[1]?.status).toBe("running");
    });

    it("should set all turns as completed when session is not running", () => {
      const session = generateMockSession("project-456", "completed", 2);
      
      expect(session.turns[0]?.status).toBe("completed");
      expect(session.turns[1]?.status).toBe("completed");
    });

    it("should generate empty session when turnCount is 0", () => {
      const session = generateMockSession("project-456", "idle", 0);
      
      expect(session.turns).toHaveLength(0);
      expect(session.status).toBe("idle");
    });
  });

  describe("createSessionSimulator", () => {
    it("should simulate session progression", () => {
      const simulator = createSessionSimulator("project-456");
      
      // Call 1: Empty session
      const state1 = simulator();
      expect(state1.status).toBe("idle");
      expect(state1.turns).toHaveLength(0);
      
      // Call 2: First turn starts
      const state2 = simulator();
      expect(state2.status).toBe("running");
      expect(state2.turns).toHaveLength(1);
      expect(state2.turns[0]?.status).toBe("running");
      expect(state2.turns[0]?.blocks).toHaveLength(1);
      
      // Call 3: First turn gets more blocks
      const state3 = simulator();
      expect(state3.status).toBe("running");
      expect(state3.turns).toHaveLength(1);
      expect(state3.turns[0]?.blocks).toHaveLength(2);
      
      // Call 4: First turn completes
      const state4 = simulator();
      expect(state4.status).toBe("idle");
      expect(state4.turns[0]?.status).toBe("completed");
      expect(state4.turns[0]?.blocks).toHaveLength(3);
      
      // Call 5: Second turn starts
      const state5 = simulator();
      expect(state5.status).toBe("running");
      expect(state5.turns).toHaveLength(2);
      expect(state5.turns[1]?.status).toBe("running");
      
      // Call 6+: Session completed
      const state6 = simulator();
      expect(state6.status).toBe("completed");
      expect(state6.turns[1]?.status).toBe("completed");
    });

    it("should maintain same session ID across calls", () => {
      const simulator = createSessionSimulator("project-456");
      
      const state1 = simulator();
      const state2 = simulator();
      const state3 = simulator();
      
      expect(state1.id).toBe(state2.id);
      expect(state2.id).toBe(state3.id);
      expect(state1.projectId).toBe("project-456");
    });

    it("should handle edge cases safely", () => {
      const simulator = createSessionSimulator("project-456");
      
      // Call many times to ensure it doesn't break
      for (let i = 0; i < 10; i++) {
        const state = simulator();
        expect(state).toBeDefined();
        expect(state.id).toBeDefined();
        expect(state.turns).toBeDefined();
      }
    });
  });

  describe("MockSessionApiClient", () => {
    it("should simulate progressive session states", async () => {
      const client = new MockSessionApiClient("project-456");
      
      // First call - initial state
      const response1 = await client.getSessionUpdates();
      expect(response1.session.status).toBe("idle");
      expect(response1.hasNewUpdates).toBe(true);
      
      // Second call - running state
      const response2 = await client.getSessionUpdates();
      expect(response2.session.status).toBe("running");
      expect(response2.hasNewUpdates).toBe(true);
    });

    it("should handle lastUpdateTimestamp for incremental updates", async () => {
      const client = new MockSessionApiClient("project-456");
      
      // First call without timestamp
      const response1 = await client.getSessionUpdates();
      expect(response1.hasNewUpdates).toBe(true);
      
      // Second call with old timestamp
      const oldTimestamp = "2020-01-01T00:00:00Z";
      const response2 = await client.getSessionUpdates(undefined, undefined, oldTimestamp);
      expect(response2.hasNewUpdates).toBe(true);
      
      // Third call with current timestamp
      const response3 = await client.getSessionUpdates(
        undefined,
        undefined,
        response2.lastUpdateTimestamp
      );
      // Could be false since timestamps might match
      expect(response3.lastUpdateTimestamp).toBeDefined();
    });

    it("should simulate network delays", async () => {
      const client = new MockSessionApiClient("project-456");
      
      const startTime = Date.now();
      await client.getSession();
      const endTime = Date.now();
      
      // Should have some delay (at least 100ms based on implementation)
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    });

    it("should create new sessions", async () => {
      const client = new MockSessionApiClient("project-456");
      
      const session = await client.createSession({
        projectId: "project-456",
        initialMessage: "Hello!",
      });
      
      expect(session.projectId).toBe("project-456");
      expect(session.status).toBe("idle");
      expect(session.turns).toHaveLength(0);
    });

    it("should interrupt sessions without error", async () => {
      const client = new MockSessionApiClient("project-456");
      
      // Should not throw
      await expect(client.interruptSession()).resolves.toBeUndefined();
    });

    it("should create new turns", async () => {
      const client = new MockSessionApiClient("project-456");
      
      const turn = await client.createTurn("project-456", "session-123");
      
      expect(turn.sessionId).toBe("session-123");
      expect(turn.status).toBe("running");
      expect(turn.blocks).toHaveLength(0);
    });
  });
});