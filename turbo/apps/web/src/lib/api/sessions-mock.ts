/**
 * Mock data generator for testing session polling
 * This can be used to simulate various session states and transitions
 */

import { Session, Turn, Block } from "./sessions";

/**
 * Generate a mock block
 */
export function generateMockBlock(
  turnId: string,
  type: Block["type"] = "content",
  content?: string,
): Block {
  const blockContent =
    content ||
    `Mock ${type} block content: ${Math.random().toString(36).substring(7)}`;

  return {
    id: `block-${Math.random().toString(36).substring(7)}`,
    turnId,
    type,
    content: blockContent,
    metadata: type === "tool_use" ? { tool: "example_tool" } : undefined,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Generate a mock turn with blocks
 */
export function generateMockTurn(
  sessionId: string,
  status: Turn["status"] = "running",
  blockCount = 3,
): Turn {
  const turnId = `turn-${Math.random().toString(36).substring(7)}`;

  const blocks: Block[] = [];

  if (blockCount > 0) {
    // Add thinking block
    blocks.push(
      generateMockBlock(turnId, "thinking", "Analyzing the request..."),
    );

    // Add tool use blocks
    if (blockCount > 1) {
      blocks.push(
        generateMockBlock(turnId, "tool_use", "Executing tool: file_reader"),
      );
    }

    // Add content blocks
    if (blockCount > 2) {
      blocks.push(
        generateMockBlock(
          turnId,
          "content",
          "Here's the response to your query...",
        ),
      );
    }
  }

  return {
    id: turnId,
    sessionId,
    status,
    userMessage:
      "Sample user message: " + Math.random().toString(36).substring(7),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    blocks,
  };
}

/**
 * Generate a mock session
 */
export function generateMockSession(
  projectId: string,
  status: Session["status"] = "running",
  turnCount = 2,
): Session {
  const sessionId = `session-${Math.random().toString(36).substring(7)}`;

  const turns: Turn[] = [];

  for (let i = 0; i < turnCount; i++) {
    const turnStatus =
      i === turnCount - 1 && status === "running" ? "running" : "completed";
    turns.push(generateMockTurn(sessionId, turnStatus));
  }

  return {
    id: sessionId,
    projectId,
    status,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    turns,
  };
}

/**
 * Simulate a session progressing through states
 * This returns a function that generates increasingly complete sessions
 */
export function createSessionSimulator(projectId: string) {
  let callCount = 0;
  const sessionId = `session-${Math.random().toString(36).substring(7)}`;
  const turns: Turn[] = [];

  return (): Session => {
    callCount++;

    // Simulate session progression
    if (callCount === 1) {
      // Initial state - empty session
      return {
        id: sessionId,
        projectId,
        status: "idle",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
        status: "running",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        turns: [...turns],
      };
    }

    if (callCount === 3) {
      // First turn gets more blocks
      if (turns[0]) {
        turns[0].blocks.push(generateMockBlock(turns[0].id, "tool_use"));
      }
      return {
        id: sessionId,
        projectId,
        status: "running",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        turns: [...turns],
      };
    }

    if (callCount === 4) {
      // First turn completes
      if (turns[0]) {
        turns[0].status = "completed";
        turns[0].blocks.push(generateMockBlock(turns[0].id, "content"));
      }
      return {
        id: sessionId,
        projectId,
        status: "idle",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
        status: "running",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        turns: [...turns],
      };
    }

    // Final state - session completed
    const lastTurn = turns[turns.length - 1];
    if (turns.length > 1 && lastTurn) {
      lastTurn.status = "completed";
      lastTurn.blocks.push(generateMockBlock(lastTurn.id, "content"));
    }

    return {
      id: sessionId,
      projectId,
      status: "completed",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
    _projectId?: string,
    _sessionId?: string,
    lastUpdateTimestamp?: string,
  ) {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    const session = this.simulator();
    const hasNewUpdates =
      !lastUpdateTimestamp || this.lastUpdate > lastUpdateTimestamp;
    this.lastUpdate = new Date().toISOString();

    return {
      session,
      hasNewUpdates,
      lastUpdateTimestamp: this.lastUpdate,
    };
  }

  async createSession(request: {
    projectId: string;
    initialMessage?: string;
  }): Promise<Session> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return generateMockSession(request.projectId, "idle", 0);
  }

  async interruptSession(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  async createTurn(_projectId: string, sessionId: string): Promise<Turn> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return generateMockTurn(sessionId, "running", 0);
  }
}
