import { describe, it, expect, vi, beforeEach } from "vitest";
import { Readable } from "stream";
import { http, HttpResponse } from "msw";
import { server } from "../test/setup";

// Mock the shared module
vi.mock("./shared", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    token: "test-token",
    apiUrl: "https://www.uspark.ai",
    sync: {},
  }),
  pushAllFiles: vi.fn().mockResolvedValue(5),
}));

// Mock chalk
vi.mock("chalk", () => ({
  default: {
    dim: (str: string) => str,
    red: (str: string) => str,
    blue: (str: string) => str,
    green: (str: string) => str,
    yellow: (str: string) => str,
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

  it("should send stdout lines to callback API", async () => {
    // Create test events
    const events = [
      JSON.stringify({
        type: "assistant",
        message: {
          id: "msg_test",
          type: "message",
          role: "assistant",
          content: [
            {
              type: "text",
              text: "Hello",
            },
          ],
        },
      }),
      JSON.stringify({
        type: "result",
        subtype: "success",
        is_error: false,
      }),
    ];

    mockStdin = Readable.from(events.map((e) => e + "\n"));
    const originalStdin = process.stdin;

    Object.defineProperty(process, "stdin", {
      value: mockStdin,
      writable: true,
    });

    const { watchClaudeCommand } = await import("./watch-claude");
    watchClaudeCommand({
      projectId: "test-project-id",
      turnId: "turn_test",
      sessionId: "sess_test",
    });

    // Wait for callback to be called
    await vi.waitFor(
      () => {
        expect(stdoutCallbackSpy).toHaveBeenCalled();
      },
      {
        timeout: 1000,
        interval: 10,
      },
    );

    Object.defineProperty(process, "stdin", {
      value: originalStdin,
      writable: true,
    });

    // Verify stdout callback was called with both event lines
    expect(stdoutCallbackSpy).toHaveBeenCalledTimes(2);
    expect(stdoutCallbackSpy).toHaveBeenCalledWith({
      line: events[0],
    });
    expect(stdoutCallbackSpy).toHaveBeenCalledWith({
      line: events[1],
    });
  });

  it("should batch push files when prefix is specified on close", async () => {
    const { pushAllFiles } = await import("./shared");

    const events = [
      JSON.stringify({
        type: "result",
        subtype: "success",
        is_error: false,
      }),
    ];

    mockStdin = Readable.from(events.map((e) => e + "\n"));
    const originalStdin = process.stdin;

    Object.defineProperty(process, "stdin", {
      value: mockStdin,
      writable: true,
    });

    const { watchClaudeCommand } = await import("./watch-claude");
    watchClaudeCommand({
      projectId: "test-project-id",
      turnId: "turn_test",
      sessionId: "sess_test",
      prefix: ".uspark",
    });

    // Wait for the stream to close and pushAllFiles to be called
    await vi.waitFor(
      () => {
        expect(pushAllFiles).toHaveBeenCalled();
      },
      {
        timeout: 2000,
        interval: 10,
      },
    );

    Object.defineProperty(process, "stdin", {
      value: originalStdin,
      writable: true,
    });

    // Verify pushAllFiles was called with correct arguments
    expect(pushAllFiles).toHaveBeenCalledWith(
      {
        token: "test-token",
        apiUrl: "https://www.uspark.ai",
        sync: {},
      },
      "test-project-id",
      ".uspark",
      ".uspark",
    );
  });

  it("should not push files when prefix is not specified", async () => {
    const { pushAllFiles } = await import("./shared");

    const events = [
      JSON.stringify({
        type: "result",
        subtype: "success",
        is_error: false,
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
      turnId: "turn_test",
      sessionId: "sess_test",
    });

    // Wait for command to complete
    await commandPromise.catch(() => {});

    // Give it extra time to ensure no unexpected calls
    await new Promise((resolve) => setTimeout(resolve, 100));

    Object.defineProperty(process, "stdin", {
      value: originalStdin,
      writable: true,
    });

    // pushAllFiles should not be called without prefix
    expect(pushAllFiles).not.toHaveBeenCalled();
  });

  it("should handle empty directory gracefully", async () => {
    const { pushAllFiles } = await import("./shared");

    // Mock pushAllFiles to return 0 (no files)
    vi.mocked(pushAllFiles).mockResolvedValueOnce(0);

    const events = [
      JSON.stringify({
        type: "result",
        subtype: "success",
        is_error: false,
      }),
    ];

    mockStdin = Readable.from(events.map((e) => e + "\n"));
    const originalStdin = process.stdin;

    Object.defineProperty(process, "stdin", {
      value: mockStdin,
      writable: true,
    });

    const { watchClaudeCommand } = await import("./watch-claude");
    watchClaudeCommand({
      projectId: "test-project-id",
      turnId: "turn_test",
      sessionId: "sess_test",
      prefix: ".uspark",
    });

    // Wait for pushAllFiles to be called
    await vi.waitFor(
      () => {
        expect(pushAllFiles).toHaveBeenCalled();
      },
      {
        timeout: 2000,
        interval: 10,
      },
    );

    Object.defineProperty(process, "stdin", {
      value: originalStdin,
      writable: true,
    });

    expect(pushAllFiles).toHaveBeenCalled();
  });

  it("should wait for pending callbacks before pushing files", async () => {
    const { pushAllFiles } = await import("./shared");

    const events = [
      JSON.stringify({
        type: "assistant",
        message: {
          id: "msg_test",
          type: "message",
          role: "assistant",
          content: [{ type: "text", text: "test" }],
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
    watchClaudeCommand({
      projectId: "test-project-id",
      turnId: "turn_test",
      sessionId: "sess_test",
      prefix: ".uspark",
    });

    // Wait for both callback and pushAllFiles to be called
    await vi.waitFor(
      () => {
        expect(stdoutCallbackSpy).toHaveBeenCalled();
        expect(pushAllFiles).toHaveBeenCalled();
      },
      {
        timeout: 2000,
        interval: 10,
      },
    );

    Object.defineProperty(process, "stdin", {
      value: originalStdin,
      writable: true,
    });

    // Both should have been called
    expect(stdoutCallbackSpy).toHaveBeenCalled();
    expect(pushAllFiles).toHaveBeenCalled();
  });
});
