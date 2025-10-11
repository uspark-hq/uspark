import { describe, it, expect, vi, beforeEach } from "vitest";
import { Readable } from "stream";
import { http, HttpResponse } from "msw";
import { server } from "../test/setup";

// Mock the shared module
vi.mock("./shared", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    token: "test-token",
    apiUrl: "https://www.uspark.ai",
  }),
  syncFile: vi.fn().mockResolvedValue(undefined),
}));

// Mock chalk
vi.mock("chalk", () => ({
  default: {
    dim: (str: string) => str,
    red: (str: string) => str,
  },
}));

describe("watch-claude", () => {
  let mockStdin: Readable;
  let stdoutCallbackSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock process.exit to prevent actual exit and Vitest errors
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    // Set up MSW handler for stdout callback API
    stdoutCallbackSpy = vi.fn();
    server.use(
      http.post(
        "https://www.uspark.ai/api/projects/:projectId/sessions/:sessionId/turns/:turnId/on-claude-stdout",
        async ({ request }) => {
          stdoutCallbackSpy(await request.json());
          return HttpResponse.json({ ok: true });
        },
      ),
    );
  });

  it("should detect Write tool_use and sync after tool_result", async () => {
    // Import after mocking
    const { syncFile } = await import("./shared");

    // Create the exact JSON events from the user's output
    const events = [
      // tool_use event
      JSON.stringify({
        type: "assistant",
        subtype: "tool_use",
        message: {
          id: "msg_01BvHYxH8yfSxQtKLkPeKnRc",
          type: "message",
          role: "assistant",
          content: [
            {
              type: "tool_use",
              id: "toolu_015LBZEJykuRthAH8dhkPzBu",
              name: "Write",
              input: {
                file_path: "/workspaces/uspark/spec/test-time.md",
                content: "# Test Time\\n\\nThis is a test file.",
              },
            },
          ],
        },
      }),
      // tool_result event (comes as type:"user" with content array)
      JSON.stringify({
        type: "user",
        message: {
          id: "msg_result_01",
          type: "message",
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: "toolu_015LBZEJykuRthAH8dhkPzBu",
              content:
                "File created successfully at: /workspaces/uspark/spec/test-time.md",
            },
          ],
        },
      }),
    ];

    // Create a readable stream from the events
    // Readable.from automatically ends the stream after all events are consumed
    mockStdin = Readable.from(events.map((e) => e + "\n"));

    // Mock process.stdin and process.cwd
    const originalStdin = process.stdin;
    const originalCwd = process.cwd;

    Object.defineProperty(process, "stdin", {
      value: mockStdin,
      writable: true,
    });

    // Mock process.cwd to match the test file path
    process.cwd = vi.fn(() => "/workspaces/uspark");

    // Import and run the watch command
    const { watchClaudeCommand } = await import("./watch-claude");

    // Run the command - it sets up readline and returns immediately
    watchClaudeCommand({
      projectId: "test-project-id",
      turnId: "turn_test",
      sessionId: "sess_test",
    });

    // Wait for both syncFile and stdout callback to be called
    // Readable.from sends data asynchronously, so we need to wait for
    // the readline to process events and trigger both sync and callback operations
    await vi.waitFor(
      () => {
        expect(syncFile).toHaveBeenCalled();
        expect(stdoutCallbackSpy).toHaveBeenCalled();
      },
      {
        timeout: 1000,
        interval: 10,
      },
    );

    // Restore stdin and cwd
    Object.defineProperty(process, "stdin", {
      value: originalStdin,
      writable: true,
    });
    process.cwd = originalCwd;

    // Verify syncFile was called with correct arguments
    expect(syncFile).toHaveBeenCalledWith(
      {
        token: "test-token",
        apiUrl: "https://www.uspark.ai",
      },
      "test-project-id",
      "spec/test-time.md", // Should be relative path
    );

    // Verify stdout callback was called with both event lines
    expect(stdoutCallbackSpy).toHaveBeenCalledTimes(2);
    expect(stdoutCallbackSpy).toHaveBeenCalledWith({
      line: events[0],
    });
    expect(stdoutCallbackSpy).toHaveBeenCalledWith({
      line: events[1],
    });
  });

  it("should handle tool_use without matching tool_result", async () => {
    const { syncFile } = await import("./shared");

    // Create events with tool_use but no tool_result
    const events = [
      JSON.stringify({
        type: "assistant",
        subtype: "tool_use",
        message: {
          id: "msg_test",
          type: "message",
          role: "assistant",
          content: [
            {
              type: "tool_use",
              id: "toolu_test",
              name: "Write",
              input: {
                file_path: "/workspaces/uspark/spec/test.md",
                content: "test",
              },
            },
          ],
        },
      }),
    ];

    // Create stream that auto-ends after events
    mockStdin = Readable.from(events.map((e) => e + "\n"));
    const originalStdin = process.stdin;
    Object.defineProperty(process, "stdin", {
      value: mockStdin,
      writable: true,
    });

    const { watchClaudeCommand } = await import("./watch-claude");
    const commandPromise = watchClaudeCommand({
      projectId: "test-project-id",
      turnId: "turn_test",
      sessionId: "sess_test",
    });

    // Wait for command to complete (no delays needed)
    await commandPromise.catch(() => {});

    Object.defineProperty(process, "stdin", {
      value: originalStdin,
      writable: true,
    });

    // syncFile should not be called without tool_result
    expect(syncFile).not.toHaveBeenCalled();
  });

  it("should only track file modification tools", async () => {
    const { syncFile } = await import("./shared");

    // Create events with non-file-modification tool
    const events = [
      JSON.stringify({
        type: "assistant",
        subtype: "tool_use",
        message: {
          id: "msg_test",
          type: "message",
          role: "assistant",
          content: [
            {
              type: "tool_use",
              id: "toolu_test",
              name: "Bash", // Not a file modification tool
              input: {
                command: "ls -la",
              },
            },
          ],
        },
      }),
      // tool_result event (comes as type:"user" with content array)
      JSON.stringify({
        type: "user",
        message: {
          id: "msg_result_02",
          type: "message",
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: "toolu_test",
              content: "file1.txt\nfile2.txt",
            },
          ],
        },
      }),
    ];

    // Create stream that auto-ends after events
    mockStdin = Readable.from(events.map((e) => e + "\n"));
    const originalStdin = process.stdin;
    Object.defineProperty(process, "stdin", {
      value: mockStdin,
      writable: true,
    });

    const { watchClaudeCommand } = await import("./watch-claude");
    const commandPromise = watchClaudeCommand({
      projectId: "test-project-id",
      turnId: "turn_test",
      sessionId: "sess_test",
    });

    // Wait for command to complete (no delays needed)
    await commandPromise.catch(() => {});

    Object.defineProperty(process, "stdin", {
      value: originalStdin,
      writable: true,
    });

    // syncFile should not be called for non-file-modification tools
    expect(syncFile).not.toHaveBeenCalled();
  });
});
