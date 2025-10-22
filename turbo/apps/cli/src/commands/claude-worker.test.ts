import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "events";
import { Readable, Writable } from "stream";
import type { ChildProcess } from "child_process";
import { claudeWorkerCommand } from "./claude-worker";

// Mock the shared module
vi.mock("./shared", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    token: "test-token",
    apiUrl: "https://www.uspark.ai",
  }),
}));

// Mock project-config
vi.mock("../project-config", () => ({
  getOrCreateWorkerId: vi.fn().mockResolvedValue("test-worker-id-12345"),
}));

// Mock chalk
vi.mock("chalk", () => ({
  default: {
    cyan: (str: string) => str,
    blue: (str: string) => str,
    yellow: (str: string) => str,
    green: (str: string) => str,
    red: (str: string) => str,
    gray: (str: string) => str,
  },
}));

// Mock child_process
vi.mock("child_process", () => ({
  spawn: vi.fn(),
}));

// Mock WorkerApiClient
vi.mock("../worker-api", () => ({
  WorkerApiClient: vi.fn().mockImplementation(() => ({
    sendHeartbeat: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Helper to create a mock child process
class MockChildProcess extends EventEmitter {
  stdin: Writable;
  stdout: Readable;
  stderr: Readable;

  constructor(stdoutData: string[] = []) {
    super();
    this.stdin = new Writable({
      write(chunk, encoding, callback) {
        callback();
      },
    });
    this.stdout = Readable.from(stdoutData.map((line) => line + "\n"));
    this.stderr = new Readable({ read() {} });
  }

  kill() {
    this.emit("close", 0);
  }
}

// Track iterations across tests
let iterations = 0;

describe("claude-worker", () => {
  let originalMaxIterations: string | undefined;
  let originalSleepDuration: string | undefined;
  let mockSpawn: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    iterations = 0;

    // Get the mocked spawn function
    const childProcess = await import("child_process");
    mockSpawn = vi.mocked(childProcess.spawn);

    // Set max iterations for testing
    originalMaxIterations = process.env.MAX_ITERATIONS;
    process.env.MAX_ITERATIONS = "3";

    // Set sleep duration to 0 for testing (no real delays)
    originalSleepDuration = process.env.SLEEP_DURATION_MS;
    process.env.SLEEP_DURATION_MS = "0";

    // Set up default mock implementation
    mockSpawn.mockImplementation((command: string) => {
      if (command === "uspark") {
        const proc = new MockChildProcess([]);
        process.nextTick(() => proc.emit("close", 0));
        return proc as unknown as ChildProcess;
      }

      if (command === "claude") {
        const mockOutput = [
          JSON.stringify({
            type: "assistant",
            message: {
              id: "msg_test",
              type: "message",
              role: "assistant",
              content: [
                {
                  type: "text",
                  text: `Iteration ${iterations + 1}: Working on task`,
                },
              ],
            },
          }),
        ];

        // Add sleep signal on second iteration
        if (iterations >= 1) {
          mockOutput.push("###USPARK_WORKER_SLEEP###");
        }

        mockOutput.push(
          JSON.stringify({
            type: "result",
            subtype: "success",
            is_error: false,
          }),
        );

        const proc = new MockChildProcess(mockOutput);
        process.nextTick(() => {
          iterations++;
          proc.emit("close", 0);
        });
        return proc as unknown as ChildProcess;
      }

      throw new Error(`Unexpected command: ${command}`);
    });
  });

  afterEach(() => {
    // Restore original MAX_ITERATIONS
    if (originalMaxIterations === undefined) {
      delete process.env.MAX_ITERATIONS;
    } else {
      process.env.MAX_ITERATIONS = originalMaxIterations;
    }

    // Restore original SLEEP_DURATION_MS
    if (originalSleepDuration === undefined) {
      delete process.env.SLEEP_DURATION_MS;
    } else {
      process.env.SLEEP_DURATION_MS = originalSleepDuration;
    }
  });

  it("should execute pull -> claude -> push cycle", async () => {
    await claudeWorkerCommand({
      projectId: "test-project",
    });

    // Verify the command sequence
    const calls = mockSpawn.mock.calls;

    // Should have completed 3 iterations with pull, claude, push each
    // 3 iterations × 3 commands = 9 total calls
    expect(calls.length).toBeGreaterThanOrEqual(9);

    // First iteration - First call: uspark pull
    expect(calls[0]?.[0]).toBe("uspark");
    expect(calls[0]?.[1]).toEqual(["pull", "--project-id", "test-project"]);
    expect(calls[0]?.[2]?.cwd).toBe(".uspark");

    // First iteration - Second call: claude
    expect(calls[1]?.[0]).toBe("claude");
    expect(calls[1]?.[1]).toEqual([
      "--continue",
      "--print",
      "--verbose",
      "--output-format",
      "stream-json",
      "--dangerously-skip-permissions",
    ]);

    // First iteration - Third call: uspark push
    expect(calls[2]?.[0]).toBe("uspark");
    expect(calls[2]?.[1]).toEqual(["push", "--project-id", "test-project"]);
    expect(calls[2]?.[2]?.cwd).toBe(".uspark");
  });

  it("should detect sleep signal and continue to next iteration", async () => {
    await claudeWorkerCommand({
      projectId: "test-project",
    });

    // Verify claude was called 3 times (for 3 iterations)
    const claudeCalls = mockSpawn.mock.calls.filter(
      (call) => call[0] === "claude",
    );
    expect(claudeCalls.length).toBe(3);

    // All 3 iterations should complete (sleep signal doesn't stop execution,
    // just adds delay which is handled by sleep() function)
    expect(iterations).toBe(3);
  });

  it("should continue immediately when no sleep signal", async () => {
    // Reset iterations and mock to never output sleep signal
    iterations = 0;
    let claudeCalls = 0;

    mockSpawn.mockImplementation((command: string) => {
      if (command === "uspark") {
        const proc = new MockChildProcess([]);
        process.nextTick(() => proc.emit("close", 0));
        return proc as unknown as ChildProcess;
      }

      if (command === "claude") {
        claudeCalls++;
        const mockOutput = [
          JSON.stringify({
            type: "assistant",
            message: {
              id: "msg_test",
              type: "message",
              role: "assistant",
              content: [{ type: "text", text: "Working" }],
            },
          }),
          JSON.stringify({
            type: "result",
            subtype: "success",
            is_error: false,
          }),
        ];

        const proc = new MockChildProcess(mockOutput);
        process.nextTick(() => proc.emit("close", 0));
        return proc as unknown as ChildProcess;
      }

      throw new Error(`Unexpected command: ${command}`);
    });

    await claudeWorkerCommand({
      projectId: "test-project",
    });

    // Should have executed 3 iterations
    expect(claudeCalls).toBe(3);
  });

  it("should handle claude errors and retry", async () => {
    // Reset iterations
    iterations = 0;
    let claudeCallCount = 0;

    mockSpawn.mockImplementation((command: string) => {
      if (command === "uspark") {
        const proc = new MockChildProcess([]);
        process.nextTick(() => proc.emit("close", 0));
        return proc as unknown as ChildProcess;
      }

      if (command === "claude") {
        claudeCallCount++;

        // First call fails, subsequent calls succeed
        if (claudeCallCount === 1) {
          const proc = new MockChildProcess([]);
          process.nextTick(() => proc.emit("close", 1)); // Exit code 1
          return proc as unknown as ChildProcess;
        }

        const proc = new MockChildProcess([
          JSON.stringify({
            type: "result",
            subtype: "success",
            is_error: false,
          }),
        ]);
        process.nextTick(() => proc.emit("close", 0));
        return proc as unknown as ChildProcess;
      }

      throw new Error(`Unexpected command: ${command}`);
    });

    await claudeWorkerCommand({
      projectId: "test-project",
    });

    // Should have called claude 3 times total:
    // - Iteration 1: failed (error caught, worker continues to iteration 2)
    // - Iteration 2: success
    // - Iteration 3: success
    expect(claudeCallCount).toBe(3);
  });
});
