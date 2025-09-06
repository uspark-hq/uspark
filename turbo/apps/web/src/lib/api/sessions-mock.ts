/**
 * Mock data generator for testing session polling
 * This can be used to simulate various session states and transitions
 * Updated to match real database schema from main branch
 */

import type { Session, Turn, Block } from "./sessions";
import { randomUUID } from "crypto";
import { BlockFactory } from "../sessions/blocks";

/**
 * Generate a mock block
 */
export function generateMockBlock(
  turnId: string,
  type: "thinking" | "content" | "tool_use" | "tool_result" = "content",
  sequenceNumber: number = 0,
): Block {
  // Use the real BlockFactory to generate consistent block content
  let blockContent;
  const mockText = `Mock ${type} block content: ${Math.random().toString(36).substring(7)}`;
  
  switch (type) {
    case "thinking":
      blockContent = BlockFactory.thinking(mockText);
      break;
    case "content":
      blockContent = BlockFactory.content(mockText);
      break;
    case "tool_use":
      blockContent = BlockFactory.toolUse("example_tool", {}, `tool_${randomUUID()}`);
      break;
    case "tool_result":
      blockContent = BlockFactory.toolResult(`tool_${randomUUID()}`, "Tool execution result");
      break;
    default:
      blockContent = BlockFactory.content(mockText);
  }

  return {
    id: `block_${randomUUID()}`,
    turnId,
    type,
    content: JSON.stringify(blockContent.content),
    sequenceNumber,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Generate a mock turn with blocks
 */
export function generateMockTurn(
  sessionId: string,
  status: "pending" | "running" | "completed" | "failed" = "running",
  blockCount = 3,
): Turn {
  const turnId = `turn_${randomUUID()}`;

  const blocks: Block[] = [];

  if (blockCount > 0) {
    // Add thinking block
    blocks.push(generateMockBlock(turnId, "thinking", 0));

    // Add tool use blocks
    if (blockCount > 1) {
      blocks.push(generateMockBlock(turnId, "tool_use", 1));
    }

    // Add content blocks
    if (blockCount > 2) {
      blocks.push(generateMockBlock(turnId, "content", 2));
    }
  }

  const now = new Date();
  return {
    id: turnId,
    sessionId,
    userPrompt: "Sample user prompt: " + Math.random().toString(36).substring(7),
    status,
    startedAt: status !== "pending" ? now.toISOString() : null,
    completedAt: status === "completed" ? now.toISOString() : null,
    errorMessage: status === "failed" ? "Mock error message" : null,
    createdAt: now.toISOString(),
    blocks,
  };
}

/**
 * Generate a mock session
 */
export function generateMockSession(
  projectId: string,
  turnCount = 2,
): Session {
  const sessionId = `sess_${randomUUID()}`;

  const turns: Turn[] = [];

  for (let i = 0; i < turnCount; i++) {
    const turnStatus = i === turnCount - 1 ? "running" : "completed";
    turns.push(generateMockTurn(sessionId, turnStatus));
  }

  const now = new Date();
  return {
    id: sessionId,
    projectId,
    title: "Mock Session",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    turns,
  };
}

/**
 * Simulate a session progressing through states
 * This returns a function that generates increasingly complete sessions
 */
export function createSessionSimulator(projectId: string) {
  let callCount = 0;
  const sessionId = `sess_${randomUUID()}`;
  const turns: Turn[] = [];

  return (): Session => {
    callCount++;
    const now = new Date();

    // Simulate session progression
    if (callCount === 1) {
      // Initial state - empty session
      return {
        id: sessionId,
        projectId,
        title: "Simulated Session",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        turns: [],
      };
    }

    if (callCount === 2) {
      // First turn starts
      const turn = generateMockTurn(sessionId, "running", 1);
      turns.push(turn);
      return {
        id: sessionId,
        projectId,
        title: "Simulated Session",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        turns: [...turns],
      };
    }

    if (callCount === 3) {
      // First turn gets more blocks
      if (turns[0]) {
        turns[0].blocks?.push(generateMockBlock(turns[0].id, "tool_use", 1));
      }
      return {
        id: sessionId,
        projectId,
        title: "Simulated Session",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        turns: [...turns],
      };
    }

    if (callCount === 4) {
      // First turn completes
      if (turns[0]) {
        turns[0].status = "completed";
        turns[0].completedAt = now.toISOString();
        turns[0].blocks?.push(generateMockBlock(turns[0].id, "content", 2));
      }
      return {
        id: sessionId,
        projectId,
        title: "Simulated Session",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        turns: [...turns],
      };
    }

    if (callCount === 5) {
      // Second turn starts
      const newTurn = generateMockTurn(sessionId, "running", 2);
      turns.push(newTurn);
      return {
        id: sessionId,
        projectId,
        title: "Simulated Session",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        turns: [...turns],
      };
    }

    // Final state - all turns completed
    const lastTurn = turns[turns.length - 1];
    if (turns.length > 1 && lastTurn) {
      lastTurn.status = "completed";
      lastTurn.completedAt = now.toISOString();
      lastTurn.blocks?.push(generateMockBlock(lastTurn.id, "content", 3));
    }

    return {
      id: sessionId,
      projectId,
      title: "Simulated Session",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      turns: [...turns],
    };
  };
}

/**
 * Mock API client for testing
 */
export class MockSessionApiClient {
  private simulator: ReturnType<typeof createSessionSimulator>;
  private lastUpdate: string;

  constructor(projectId: string) {
    this.simulator = createSessionSimulator(projectId);
    this.lastUpdate = new Date().toISOString();
  }

  async getSession(): Promise<Session> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 200));
    return this.simulator();
  }

  async getSessionUpdates(
    _projectId: string,
    _sessionId: string,
    lastTurnIndex?: number,
    lastBlockIndex?: number,
  ) {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    const session = this.simulator();
    const turnIndex = lastTurnIndex ?? -1;
    const blockIndex = lastBlockIndex ?? -1;

    // Calculate new turns and updated turns
    const turns = session.turns || [];
    const newTurnIds = turns
      .slice(turnIndex + 1)
      .map(turn => turn.id);

    const updatedTurns = [];
    if (turnIndex >= 0 && turnIndex < turns.length) {
      const turn = turns[turnIndex];
      if (turn && turn.blocks) {
        const newBlockIds = turn.blocks
          .slice(blockIndex + 1)
          .map(block => block.id);
        
        if (newBlockIds.length > 0) {
          updatedTurns.push({
            id: turn.id,
            status: turn.status,
            new_block_ids: newBlockIds,
            block_count: turn.blocks.length,
          });
        }
      }
    }

    const hasActiveTurns = turns.some(
      turn => turn.status === "running" || turn.status === "pending"
    );

    return {
      session: {
        id: session.id,
        updated_at: session.updatedAt,
      },
      new_turn_ids: newTurnIds,
      updated_turns: updatedTurns,
      has_active_turns: hasActiveTurns,
    };
  }

  async createSession(request: {
    projectId: string;
    initialMessage?: string;
  }): Promise<Session> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return generateMockSession(request.projectId, 0);
  }

  async interruptSession(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  async createTurn(_projectId: string, sessionId: string): Promise<Turn> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return generateMockTurn(sessionId, "running", 0);
  }
}
