import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import "../../../../../../../../../src/test/setup";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { POST as createProject } from "../../../../../../route";
import { DELETE as deleteProject } from "../../../../../route";
import { POST as createSession } from "../../../../route";
import { POST as createTurn } from "../../route";
import { initServices } from "../../../../../../../../../src/lib/init-services";
import {
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

  // NOTE: Direct DB operation for Claude token
  // Exception justified: No public API exists for token management (security sensitive).
  // Creating APIs just for tests violates YAGNI and could expose security risks.
  // This is authentication setup, not business logic testing.
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

  // NOTE: Direct DB operation for CLI token
  // Exception justified: No public API exists for token management (security sensitive).
  // Creating APIs just for tests violates YAGNI and could expose security risks.
  // This is authentication setup, not business logic testing.
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
    // Clean up project via DELETE API (cascades to sessions, turns, blocks)
    const deleteRequest = new NextRequest("http://localhost:3000", {
      method: "DELETE",
    });
    const deleteContext = { params: Promise.resolve({ projectId }) };
    await deleteProject(deleteRequest, deleteContext);

    // NOTE: Direct DB operation for token cleanup
    // Exception justified: No DELETE API exists for tokens (security sensitive).
    // This is authentication teardown, not business logic testing.
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

  it("should process complete Claude Code execution flow", async () => {
    const context = {
      params: Promise.resolve({ projectId, sessionId, turnId }),
    };

    // 1. System init message (should be skipped - no block created)
    const systemInit = JSON.stringify({
      type: "system",
      subtype: "init",
      cwd: "/home/user/workspace",
      session_id: "d75cbfa8-1d13-48b8-938f-694df2fd296d",
      tools: [
        "Task",
        "Bash",
        "Glob",
        "Grep",
        "ExitPlanMode",
        "Read",
        "Edit",
        "Write",
        "NotebookEdit",
        "WebFetch",
        "TodoWrite",
        "WebSearch",
        "BashOutput",
        "KillShell",
        "SlashCommand",
      ],
      mcp_servers: [],
      model: "claude-sonnet-4-5-20250929",
      permissionMode: "bypassPermissions",
      slash_commands: [
        "compact",
        "context",
        "cost",
        "init",
        "output-style:new",
        "pr-comments",
        "release-notes",
        "todos",
        "review",
        "security-review",
      ],
      apiKeySource: "none",
      output_style: "default",
      agents: ["general-purpose", "statusline-setup", "output-style-setup"],
      uuid: "36c6e251-9909-4d40-837e-ad581282f8db",
    });
    const req1 = new NextRequest("http://localhost:3000", {
      method: "POST",
      body: JSON.stringify({ line: systemInit }),
    });
    const res1 = await POST(req1, context);
    expect(res1.status).toBe(200);

    // 2. Assistant message with text content
    const assistantText = JSON.stringify({
      type: "assistant",
      message: {
        model: "claude-sonnet-4-5-20250929",
        id: "msg_01EwmJfbTp8b38ZoYcnRimVz",
        type: "message",
        role: "assistant",
        content: [
          {
            type: "text",
            text: "I'll list the files in the current working directory.",
          },
        ],
        stop_reason: null,
        stop_sequence: null,
        usage: {
          input_tokens: 3,
          cache_creation_input_tokens: 8439,
          cache_read_input_tokens: 5432,
          cache_creation: {
            ephemeral_5m_input_tokens: 8439,
            ephemeral_1h_input_tokens: 0,
          },
          output_tokens: 3,
          service_tier: "standard",
        },
      },
      parent_tool_use_id: null,
      session_id: "d75cbfa8-1d13-48b8-938f-694df2fd296d",
      uuid: "1e843266-09b6-431e-b3f5-e206c9bbbf46",
    });
    const req2 = new NextRequest("http://localhost:3000", {
      method: "POST",
      body: JSON.stringify({ line: assistantText }),
    });
    const res2 = await POST(req2, context);
    expect(res2.status).toBe(200);

    // 3. Assistant message with tool_use (Bash command)
    const assistantToolUse = JSON.stringify({
      type: "assistant",
      message: {
        model: "claude-sonnet-4-5-20250929",
        id: "msg_01EwmJfbTp8b38ZoYcnRimVz",
        type: "message",
        role: "assistant",
        content: [
          {
            type: "tool_use",
            id: "toolu_01Cy4woYq9zaAz56Uz79fPtv",
            name: "Bash",
            input: {
              command: "ls -la",
              description: "List files in current directory",
            },
          },
        ],
        stop_reason: null,
        stop_sequence: null,
        usage: {
          input_tokens: 3,
          cache_creation_input_tokens: 8439,
          cache_read_input_tokens: 5432,
          cache_creation: {
            ephemeral_5m_input_tokens: 8439,
            ephemeral_1h_input_tokens: 0,
          },
          output_tokens: 3,
          service_tier: "standard",
        },
      },
      parent_tool_use_id: null,
      session_id: "d75cbfa8-1d13-48b8-938f-694df2fd296d",
      uuid: "b1a67cef-51e3-4f2d-8ec3-6492e8923384",
    });
    const req3 = new NextRequest("http://localhost:3000", {
      method: "POST",
      body: JSON.stringify({ line: assistantToolUse }),
    });
    const res3 = await POST(req3, context);
    expect(res3.status).toBe(200);

    // 4. User message with tool_result (Bash output) - treated as tool_result type
    const userToolResult = JSON.stringify({
      type: "user",
      message: {
        role: "user",
        content: [
          {
            tool_use_id: "toolu_01Cy4woYq9zaAz56Uz79fPtv",
            type: "tool_result",
            content:
              "total 124\ndrwxr-xr-x 7 user user  4096 Oct 11 18:40 .\ndrwxr-xr-x 4 user user  4096 Oct 11 18:40 ..\n-rw-r--r-- 1 user user  6162 Oct 11 18:40 .DS_Store\ndrwxr-xr-x 2 user user  4096 Oct 11 18:40 archived\n-rw-r--r-- 1 user user 11876 Oct 11 18:40 bad-smell.md",
            is_error: false,
          },
        ],
      },
      parent_tool_use_id: null,
      session_id: "d75cbfa8-1d13-48b8-938f-694df2fd296d",
      uuid: "d2b13a2e-6186-4d5b-b333-482c9ecc9200",
    });
    const req4 = new NextRequest("http://localhost:3000", {
      method: "POST",
      body: JSON.stringify({ line: userToolResult }),
    });
    const res4 = await POST(req4, context);
    expect(res4.status).toBe(200);

    // 5. Assistant final response
    const assistantFinal = JSON.stringify({
      type: "assistant",
      message: {
        model: "claude-sonnet-4-5-20250929",
        id: "msg_01DDzVdTupB4n58uWWHw4DZL",
        type: "message",
        role: "assistant",
        content: [
          {
            type: "text",
            text: "The workspace contains several markdown documentation files and directories:\n\n**Files:**\n- `bad-smell.md` - likely code smell documentation\n- `claude-code-output.md` - output documentation",
          },
        ],
        stop_reason: null,
        stop_sequence: null,
        usage: {
          input_tokens: 6,
          cache_creation_input_tokens: 681,
          cache_read_input_tokens: 13871,
          cache_creation: {
            ephemeral_5m_input_tokens: 681,
            ephemeral_1h_input_tokens: 0,
          },
          output_tokens: 1,
          service_tier: "standard",
        },
      },
      parent_tool_use_id: null,
      session_id: "d75cbfa8-1d13-48b8-938f-694df2fd296d",
      uuid: "f4b84afe-c7d3-4dae-b4fb-2e4133e6b0db",
    });
    const req5 = new NextRequest("http://localhost:3000", {
      method: "POST",
      body: JSON.stringify({ line: assistantFinal }),
    });
    const res5 = await POST(req5, context);
    expect(res5.status).toBe(200);

    // 6. Result message (should mark turn as completed)
    const resultMessage = JSON.stringify({
      type: "result",
      subtype: "success",
      is_error: false,
      duration_ms: 9896,
      duration_api_ms: 10858,
      num_turns: 4,
      result:
        "The workspace contains several markdown documentation files and directories...",
      session_id: "d75cbfa8-1d13-48b8-938f-694df2fd296d",
      total_cost_usd: 0.044974099999999996,
      usage: {
        input_tokens: 9,
        cache_creation_input_tokens: 9120,
        cache_read_input_tokens: 19303,
        output_tokens: 275,
        server_tool_use: {
          web_search_requests: 0,
        },
        service_tier: "standard",
        cache_creation: {
          ephemeral_1h_input_tokens: 0,
          ephemeral_5m_input_tokens: 9120,
        },
      },
      modelUsage: {
        "claude-sonnet-4-5-20250929": {
          inputTokens: 9,
          outputTokens: 275,
          cacheReadInputTokens: 19303,
          cacheCreationInputTokens: 9120,
          webSearchRequests: 0,
          costUSD: 0.0441429,
          contextWindow: 200000,
        },
        "claude-3-5-haiku-20241022": {
          inputTokens: 879,
          outputTokens: 32,
          cacheReadInputTokens: 0,
          cacheCreationInputTokens: 0,
          webSearchRequests: 0,
          costUSD: 0.0008312,
          contextWindow: 200000,
        },
      },
      permission_denials: [],
      uuid: "78c4034f-cf55-4d3a-a1ee-780dea285000",
    });
    const req6 = new NextRequest("http://localhost:3000", {
      method: "POST",
      body: JSON.stringify({ line: resultMessage }),
    });
    const res6 = await POST(req6, context);
    expect(res6.status).toBe(200);

    // Verify all blocks were created with correct sequence numbers
    const blocks = await globalThis.services.db
      .select()
      .from(BLOCKS_TBL)
      .where(eq(BLOCKS_TBL.turnId, turnId))
      .orderBy(BLOCKS_TBL.sequenceNumber);

    // Should have 4 blocks now (system init and result are skipped)
    // Block 0: assistant text content
    // Block 1: assistant tool_use
    // Block 2: user tool_result
    // Block 3: assistant final response
    expect(blocks).toHaveLength(4);

    // Verify first block (text content)
    expect(blocks[0]!.type).toBe("content");
    expect(blocks[0]!.content).toMatchObject({
      text: "I'll list the files in the current working directory.",
    });
    expect(blocks[0]!.sequenceNumber).toBe(0);

    // Verify second block (tool_use)
    expect(blocks[1]!.type).toBe("tool_use");
    expect(blocks[1]!.content).toMatchObject({
      tool_name: "Bash",
      tool_use_id: "toolu_01Cy4woYq9zaAz56Uz79fPtv",
      parameters: {
        command: "ls -la",
        description: "List files in current directory",
      },
    });
    expect(blocks[1]!.sequenceNumber).toBe(1);

    // Verify third block (tool_result from user message)
    expect(blocks[2]!.type).toBe("tool_result");
    expect(blocks[2]!.content).toMatchObject({
      tool_use_id: "toolu_01Cy4woYq9zaAz56Uz79fPtv",
      error: null,
    });
    expect(blocks[2]!.content.result).toContain("total 124");
    expect(blocks[2]!.sequenceNumber).toBe(2);

    // Verify fourth block (final response)
    expect(blocks[3]!.type).toBe("content");
    expect(blocks[3]!.content.text).toContain(
      "The workspace contains several markdown",
    );
    expect(blocks[3]!.sequenceNumber).toBe(3);

    // Verify turn was marked as completed
    const [turn] = await globalThis.services.db
      .select()
      .from(TURNS_TBL)
      .where(eq(TURNS_TBL.id, turnId));

    expect(turn!.status).toBe("completed");
    expect(turn!.completedAt).not.toBeNull();
  });
});
