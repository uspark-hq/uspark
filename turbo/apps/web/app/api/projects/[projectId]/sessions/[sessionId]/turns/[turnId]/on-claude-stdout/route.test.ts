import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import "../../../../../../../../../src/test/setup";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { POST as createProject } from "../../../../../../route";
import { POST as createSession } from "../../../../route";
import { POST as createTurn } from "../../route";
import { initServices } from "../../../../../../../../../src/lib/init-services";
import { PROJECTS_TBL } from "../../../../../../../../../src/db/schema/projects";
import {
  SESSIONS_TBL,
  TURNS_TBL,
  BLOCKS_TBL,
} from "../../../../../../../../../src/db/schema/sessions";
import { CLI_TOKENS_TBL } from "../../../../../../../../../src/db/schema/cli-tokens";
import { CLAUDE_TOKENS_TBL } from "../../../../../../../../../src/db/schema/claude-tokens";
import { eq } from "drizzle-orm";

// Mock Clerk authentication
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

// Mock ClaudeExecutor to prevent actual execution during tests
vi.mock("../../../../../../../../../../src/lib/claude-executor", () => ({
  ClaudeExecutor: {
    execute: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock headers for CLI token auth
vi.mock("next/headers", async () => {
  const actual =
    await vi.importActual<typeof import("next/headers")>("next/headers");
  return {
    ...actual,
    headers: vi.fn(),
  };
});

import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
const mockAuth = vi.mocked(auth);
const mockHeaders = vi.mocked(headers);

/**
 * Test helper: Setup authentication mocks for CLI token auth
 */
function setupTestAuth(
  userId: string,
  cliToken: string,
): { setupCliAuth: () => void; resetAuth: () => void } {
  const setupCliAuth = () => {
    // Mock Clerk auth to fail (will use CLI token)
    mockAuth.mockResolvedValue({ userId: null } as Awaited<
      ReturnType<typeof auth>
    >);

    // Mock headers to return CLI token
    mockHeaders.mockReturnValue(
      Promise.resolve({
        get: (name: string) => {
          if (name === "Authorization") {
            return `Bearer ${cliToken}`;
          }
          return null;
        },
      } as Headers),
    );
  };

  const resetAuth = () => {
    mockHeaders.mockReset();
    mockHeaders.mockReturnValue(
      Promise.resolve({
        get: () => null,
      } as unknown as Headers),
    );
    mockAuth.mockReset();
    mockAuth.mockResolvedValue({ userId: null } as Awaited<
      ReturnType<typeof auth>
    >);
  };

  return { setupCliAuth, resetAuth };
}

/**
 * Test helper: Create complete test context (project, session, turn, tokens)
 */
async function createTestTurnContext(userId: string, cliToken: string) {
  initServices();

  // Create project via API
  mockAuth.mockResolvedValue({ userId } as Awaited<ReturnType<typeof auth>>);
  const createProjectRequest = new NextRequest("http://localhost:3000", {
    method: "POST",
    body: JSON.stringify({ name: "Test Project" }),
  });
  const projectResponse = await createProject(createProjectRequest);
  expect(projectResponse.status).toBe(201);
  const projectData = await projectResponse.json();
  const projectId = projectData.id;

  // Create session via API
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
  const sessionId = sessionData.id;

  // Add Claude token (no API endpoint, direct DB acceptable)
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

  // Create turn via API
  const createTurnRequest = new NextRequest("http://localhost:3000", {
    method: "POST",
    body: JSON.stringify({ user_message: "Test prompt" }),
  });
  const turnContext = { params: Promise.resolve({ projectId, sessionId }) };
  const turnResponse = await createTurn(createTurnRequest, turnContext);
  expect(turnResponse.status).toBe(200);
  const turnData = await turnResponse.json();
  const turnId = turnData.id;

  // Create CLI token (no API endpoint, direct DB acceptable)
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await globalThis.services.db
    .insert(CLI_TOKENS_TBL)
    .values({
      token: cliToken,
      userId,
      name: "Test CLI Token",
      expiresAt,
      createdAt: new Date(),
    })
    .onConflictDoNothing();

  return { projectId, sessionId, turnId };
}

describe("/api/projects/:projectId/sessions/:sessionId/turns/:turnId/on-claude-stdout", () => {
  const userId = `test-user-stdout-${Date.now()}-${process.pid}`;
  const cliToken = `usp_live_test_${Date.now()}`;
  let projectId: string;
  let sessionId: string;
  let turnId: string;
  let auth: ReturnType<typeof setupTestAuth>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Setup authentication
    auth = setupTestAuth(userId, cliToken);
    auth.setupCliAuth();

    // Create test context (project, session, turn, tokens)
    const context = await createTestTurnContext(userId, cliToken);
    projectId = context.projectId;
    sessionId = context.sessionId;
    turnId = context.turnId;
  });

  afterEach(async () => {
    // Clean up in correct order (sessions -> project)
    // Note: turns and blocks cascade delete from sessions
    await globalThis.services.db
      .delete(SESSIONS_TBL)
      .where(eq(SESSIONS_TBL.id, sessionId));
    await globalThis.services.db
      .delete(PROJECTS_TBL)
      .where(eq(PROJECTS_TBL.id, projectId));

    // Clean up tokens (no cascade, must delete directly)
    await globalThis.services.db
      .delete(CLI_TOKENS_TBL)
      .where(eq(CLI_TOKENS_TBL.token, cliToken));
    await globalThis.services.db
      .delete(CLAUDE_TOKENS_TBL)
      .where(eq(CLAUDE_TOKENS_TBL.userId, userId));
  });

  it("should create block from assistant content", async () => {
    const line = JSON.stringify({
      type: "assistant",
      message: {
        content: [
          {
            type: "text",
            text: "Hello, how can I help you?",
          },
        ],
      },
    });

    const request = new NextRequest("http://localhost:3000", {
      method: "POST",
      body: JSON.stringify({ line }),
    });
    const context = {
      params: Promise.resolve({ projectId, sessionId, turnId }),
    };

    const response = await POST(request, context);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ ok: true });

    // Verify block was created
    const blocks = await globalThis.services.db
      .select()
      .from(BLOCKS_TBL)
      .where(eq(BLOCKS_TBL.turnId, turnId));

    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.type).toBe("content");
    expect(blocks[0]!.content).toMatchObject({
      text: "Hello, how can I help you?",
    });
    expect(blocks[0]!.sequenceNumber).toBe(0);
  });

  it("should create block from tool_use", async () => {
    const line = JSON.stringify({
      type: "assistant",
      message: {
        content: [
          {
            type: "tool_use",
            id: "tool_123",
            name: "Read",
            input: { file_path: "/test.txt" },
          },
        ],
      },
    });

    const request = new NextRequest("http://localhost:3000", {
      method: "POST",
      body: JSON.stringify({ line }),
    });
    const context = {
      params: Promise.resolve({ projectId, sessionId, turnId }),
    };

    const response = await POST(request, context);

    expect(response.status).toBe(200);

    // Verify block was created
    const blocks = await globalThis.services.db
      .select()
      .from(BLOCKS_TBL)
      .where(eq(BLOCKS_TBL.turnId, turnId));

    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.type).toBe("tool_use");
    expect(blocks[0]!.content).toMatchObject({
      tool_name: "Read",
      tool_use_id: "tool_123",
      parameters: { file_path: "/test.txt" },
    });
  });

  it("should create block from tool_result", async () => {
    const line = JSON.stringify({
      type: "tool_result",
      tool_use_id: "tool_123",
      content: "File contents here",
      is_error: false,
    });

    const request = new NextRequest("http://localhost:3000", {
      method: "POST",
      body: JSON.stringify({ line }),
    });
    const context = {
      params: Promise.resolve({ projectId, sessionId, turnId }),
    };

    const response = await POST(request, context);

    expect(response.status).toBe(200);

    // Verify block was created
    const blocks = await globalThis.services.db
      .select()
      .from(BLOCKS_TBL)
      .where(eq(BLOCKS_TBL.turnId, turnId));

    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.type).toBe("tool_result");
    expect(blocks[0]!.content).toMatchObject({
      tool_use_id: "tool_123",
      result: "File contents here",
      error: null,
    });
  });

  it("should increment sequence numbers correctly", async () => {
    const context = {
      params: Promise.resolve({ projectId, sessionId, turnId }),
    };

    // Send first block
    const line1 = JSON.stringify({
      type: "assistant",
      message: { content: [{ type: "text", text: "First" }] },
    });
    const request1 = new NextRequest("http://localhost:3000", {
      method: "POST",
      body: JSON.stringify({ line: line1 }),
    });
    await POST(request1, context);

    // Send second block
    const line2 = JSON.stringify({
      type: "assistant",
      message: { content: [{ type: "text", text: "Second" }] },
    });
    const request2 = new NextRequest("http://localhost:3000", {
      method: "POST",
      body: JSON.stringify({ line: line2 }),
    });
    await POST(request2, context);

    // Verify sequence numbers
    const blocks = await globalThis.services.db
      .select()
      .from(BLOCKS_TBL)
      .where(eq(BLOCKS_TBL.turnId, turnId))
      .orderBy(BLOCKS_TBL.sequenceNumber);

    expect(blocks).toHaveLength(2);
    expect(blocks[0]!.sequenceNumber).toBe(0);
    expect(blocks[1]!.sequenceNumber).toBe(1);
  });

  it("should update turn status to completed on result block", async () => {
    const line = JSON.stringify({
      type: "result",
      total_cost_usd: 0.001,
      usage: { input_tokens: 100, output_tokens: 50 },
    });

    const request = new NextRequest("http://localhost:3000", {
      method: "POST",
      body: JSON.stringify({ line }),
    });
    const context = {
      params: Promise.resolve({ projectId, sessionId, turnId }),
    };

    const response = await POST(request, context);

    expect(response.status).toBe(200);

    // Verify turn status was updated
    const [turn] = await globalThis.services.db
      .select()
      .from(TURNS_TBL)
      .where(eq(TURNS_TBL.id, turnId));

    expect(turn!.status).toBe("completed");
    expect(turn!.completedAt).not.toBeNull();
  });

  it("should reject requests without authentication", async () => {
    // Reset authentication to simulate no auth
    auth.resetAuth();

    const line = JSON.stringify({
      type: "assistant",
      message: { content: [{ type: "text", text: "Test" }] },
    });

    const request = new NextRequest("http://localhost:3000", {
      method: "POST",
      body: JSON.stringify({ line }),
    });
    const context = {
      params: Promise.resolve({ projectId, sessionId, turnId }),
    };

    const response = await POST(request, context);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe("unauthorized");
  });
});
