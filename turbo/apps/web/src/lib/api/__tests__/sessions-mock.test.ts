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
        sequenceNumber: 0,
        createdAt: expect.any(String),
      });
      expect(block.id).toMatch(/^block_/);
    });

    it("should generate a block with sequence number", () => {
      const block = generateMockBlock("turn-123", "thinking", 5);
      
      expect(block).toMatchObject({
        turnId: "turn-123",
        type: "thinking",
        sequenceNumber: 5,
      });
      
      // Content should be JSON stringified
      const content = JSON.parse(block.content);
      expect(content).toHaveProperty("text");
    });

    it("should include tool info for tool_use blocks", () => {
      const block = generateMockBlock("turn-123", "tool_use");
      
      const content = JSON.parse(block.content);
      expect(content).toHaveProperty("tool_name", "example_tool");
      expect(content).toHaveProperty("parameters");
      expect(content).toHaveProperty("tool_use_id");
    });

    it("should handle tool_result blocks correctly", () => {
      const block = generateMockBlock("turn-123", "tool_result");
      
      const content = JSON.parse(block.content);
      expect(content).toHaveProperty("tool_use_id");
      expect(content).toHaveProperty("result");
      expect(content).toHaveProperty("error", null);
    });
  });

  describe("generateMockTurn", () => {
    it("should generate a turn with specified block count", () => {
      const turn = generateMockTurn("session-123", "running", 3);
      
      expect(turn).toMatchObject({
        sessionId: "session-123",
        status: "running",
        userPrompt: expect.stringContaining("Sample user prompt"),
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
      expect(turn1.userPrompt).not.toBe(turn2.userPrompt);
    });
  });

  describe("generateMockSession", () => {
    it("should generate session with specified turn count", () => {
      const session = generateMockSession("project-456", 3);
      
      expect(session).toMatchObject({
        projectId: "project-456",
        title: "Mock Session",
        turns: expect.any(Array),
      });
      expect(session.turns).toHaveLength(3);
    });

    it("should set last turn as running", () => {
      const session = generateMockSession("project-456", 2);
      
      expect(session.turns[0]?.status).toBe("completed");
      expect(session.turns[1]?.status).toBe("running");
    });

    it("should set all turns as completed when turnCount is 1", () => {
      const session = generateMockSession("project-456", 1);
      
      // Single turn should be running (last turn)
      expect(session.turns[0]?.status).toBe("running");
    });

    it("should generate empty session when turnCount is 0", () => {
      const session = generateMockSession("project-456", 0);
      
      expect(session.turns).toHaveLength(0);
      expect(session.title).toBe("Mock Session");
    });
  });

  describe("createSessionSimulator", () => {
    it("should simulate session progression", () => {
      const simulator = createSessionSimulator("project-456");
      
      // Call 1: Empty session
      const state1 = simulator();
      expect(state1.title).toBe("Simulated Session");
      expect(state1.turns).toHaveLength(0);
      
      // Call 2: First turn starts
      const state2 = simulator();
      expect(state2.turns).toHaveLength(1);
      expect(state2.turns[0]?.status).toBe("running");
      expect(state2.turns[0]?.blocks).toHaveLength(1);
      
      // Call 3: First turn gets more blocks
      const state3 = simulator();
      expect(state3.turns).toHaveLength(1);
      expect(state3.turns[0]?.blocks).toHaveLength(2);
      
      // Call 4: First turn completes
      const state4 = simulator();
      expect(state4.turns[0]?.status).toBe("completed");
      expect(state4.turns[0]?.blocks).toHaveLength(3);
      
      // Call 5: Second turn starts
      const state5 = simulator();
      expect(state5.turns).toHaveLength(2);
      expect(state5.turns[1]?.status).toBe("running");
      
      // Call 6+: Session completed
      const state6 = simulator();
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
      const response1 = await client.getSessionUpdates("project-456", "session-1");
      expect(response1.new_turn_ids.length).toBe(0);
      expect(response1.has_active_turns).toBe(false);
      
      // Second call - running state
      const response2 = await client.getSessionUpdates("project-456", "session-1");
      expect(response2.new_turn_ids.length).toBeGreaterThanOrEqual(0);
      expect(response2.has_active_turns).toBeDefined();
    });

    it("should handle indices for incremental updates", async () => {
      const client = new MockSessionApiClient("project-456");
      
      // First call without indices
      const response1 = await client.getSessionUpdates("project-456", "session-1");
      expect(response1.new_turn_ids).toBeDefined();
      
      // Second call with indices
      const response2 = await client.getSessionUpdates("project-456", "session-1", 0, 0);
      expect(response2.updated_turns).toBeDefined();
      
      // Third call with different indices
      const response3 = await client.getSessionUpdates(
        "project-456",
        "session-1",
        1,
        2
      );
      expect(response3.session.updated_at).toBeDefined();
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
      expect(session.title).toBe("Mock Session");
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