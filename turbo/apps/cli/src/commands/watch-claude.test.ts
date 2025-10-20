import { describe, it, expect, vi, beforeEach } from "vitest";
import { Readable } from "stream";
import { http, HttpResponse } from "msw";
import { server } from "../test/setup";
import { watchClaudeCommand } from "./watch-claude";

// Mock the shared module
vi.mock("./shared", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    token: "test-token",
    apiUrl: "https://www.uspark.ai",
    sync: {},
  }),
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

  it("should complete successfully when stream closes", async () => {
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

    const exitSpy = vi.spyOn(process, "exit");

    watchClaudeCommand({
      projectId: "test-project-id",
      turnId: "turn_test",
      sessionId: "sess_test",
      prefix: ".uspark",
    });

    // Wait for the stream to close
    await vi.waitFor(
      () => {
        expect(exitSpy).toHaveBeenCalledWith(0);
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
  });

  // Tests removed: watch-claude no longer performs file pushing
  // File synchronization is now handled externally by the exec script

  it("should wait for pending callbacks before exiting", async () => {
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

    const exitSpy = vi.spyOn(process, "exit");

    watchClaudeCommand({
      projectId: "test-project-id",
      turnId: "turn_test",
      sessionId: "sess_test",
      prefix: ".uspark",
    });

    // Wait for callback and exit to be called
    await vi.waitFor(
      () => {
        expect(stdoutCallbackSpy).toHaveBeenCalled();
        expect(exitSpy).toHaveBeenCalledWith(0);
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

    // Callback should have been called before exit
    expect(stdoutCallbackSpy).toHaveBeenCalled();
  });
});
