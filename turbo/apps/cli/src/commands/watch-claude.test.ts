import { describe, it, expect, vi, beforeEach } from "vitest";
import { Readable } from "stream";

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
  },
}));

describe("watch-claude", () => {
  let mockStdin: Readable;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock process.exit to prevent actual exit and Vitest errors
    vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
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

    // Run the command in the background
    const commandPromise = watchClaudeCommand({
      projectId: "test-project-id",
    });

    // Use nextTick to ensure event loop processes line events before close
    await new Promise((resolve) => process.nextTick(resolve));

    // Close stdin to trigger command completion
    // Readline will process all queued lines before firing close event
    mockStdin.push(null);

    // Wait for command to complete
    await commandPromise.catch(() => {}); // Ignore exit errors

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

    mockStdin = Readable.from(events.map((e) => e + "\n"));
    const originalStdin = process.stdin;
    Object.defineProperty(process, "stdin", {
      value: mockStdin,
      writable: true,
    });

    const { watchClaudeCommand } = await import("./watch-claude");
    const commandPromise = watchClaudeCommand({
      projectId: "test-project-id",
    });

    mockStdin.push(null);
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

    mockStdin = Readable.from(events.map((e) => e + "\n"));
    const originalStdin = process.stdin;
    Object.defineProperty(process, "stdin", {
      value: mockStdin,
      writable: true,
    });

    const { watchClaudeCommand } = await import("./watch-claude");
    const commandPromise = watchClaudeCommand({
      projectId: "test-project-id",
    });

    mockStdin.push(null);
    await commandPromise.catch(() => {});

    Object.defineProperty(process, "stdin", {
      value: originalStdin,
      writable: true,
    });

    // syncFile should not be called for non-file-modification tools
    expect(syncFile).not.toHaveBeenCalled();
  });
});
