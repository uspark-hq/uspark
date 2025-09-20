import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useSessionPolling } from "../use-session-polling";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock AbortController
const mockAbort = vi.fn();

class MockAbortSignal {
  aborted = false;
}

const mockAbortController = {
  abort: mockAbort,
  signal: new MockAbortSignal(),
};

global.AbortController = vi.fn(
  () => mockAbortController,
) as unknown as typeof AbortController;

describe("useSessionPolling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAbort.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should not start polling without sessionId", () => {
    renderHook(() => useSessionPolling("project-1", null));

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should use long polling with version tracking", async () => {
    const mockProjectId = "test-project";
    const mockSessionId = "sess_test123";

    // Mock initial fetch response (regular turns endpoint)
    const initialTurns = {
      turns: [
        {
          id: "turn_1",
          userPrompt: "Hello",
          status: "completed",
          version: 1,
          block_count: 2,
        },
      ],
    };

    // Mock turn detail response
    const turnDetail = {
      blocks: [
        {
          id: "block_1",
          type: "content",
          content: { text: "Hi!" },
          sequenceNumber: 0,
        },
        {
          id: "block_2",
          type: "content",
          content: { text: "How are you?" },
          sequenceNumber: 1,
        },
      ],
    };

    // Mock long poll response with update
    const updateResponse = {
      version: 2,
      hasMore: false,
      session: {
        id: mockSessionId,
        version: 2,
        updatedAt: new Date().toISOString(),
      },
      turns: [
        {
          id: "turn_2",
          userPrompt: "New message",
          status: "in_progress",
          version: 2,
          blockCount: 1,
          blocks: [
            {
              id: "block_3",
              type: "thinking",
              content: { text: "Processing..." },
              sequenceNumber: 0,
            },
          ],
        },
      ],
    };

    let fetchCallCount = 0;
    mockFetch.mockImplementation(async (url: string) => {
      fetchCallCount++;

      if (url.includes("/turns") && !url.includes("/turn_")) {
        // Initial turns list
        return {
          ok: true,
          json: async () => initialTurns,
        };
      }

      if (url.includes("/turns/turn_1")) {
        // Turn detail
        return {
          ok: true,
          json: async () => turnDetail,
        };
      }

      if (url.includes("/updates")) {
        // Long polling endpoint
        if (fetchCallCount <= 3) {
          // First call returns 204 (no updates)
          return {
            ok: true,
            status: 204,
            headers: {
              get: (header: string) =>
                header === "X-Session-Version" ? "1" : null,
            },
          };
        } else {
          // Second call returns update
          return {
            ok: true,
            status: 200,
            json: async () => updateResponse,
          };
        }
      }

      return {
        ok: false,
        status: 404,
      };
    });

    const { result } = renderHook(() =>
      useSessionPolling(mockProjectId, mockSessionId),
    );

    // Wait for initial fetch
    await waitFor(() => {
      expect(result.current.turns).toHaveLength(1);
    });

    // Verify initial state
    expect(result.current.version).toBe(1);
    expect(result.current.turns[0].id).toBe("turn_1");

    // Wait for long poll to receive update
    await waitFor(
      () => {
        expect(result.current.turns).toHaveLength(2);
      },
      { timeout: 5000 },
    );

    // Verify updated state
    expect(result.current.version).toBe(2);
    expect(result.current.turns[1].id).toBe("turn_2");
    expect(result.current.turns[1].status).toBe("in_progress");
    expect(result.current.hasActiveTurns).toBe(true);
  });

  it("should handle 204 No Content responses correctly", async () => {
    const mockProjectId = "test-project";
    const mockSessionId = "sess_test456";

    const initialTurns = {
      turns: [],
    };

    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes("/turns") && !url.includes("/turn_")) {
        return {
          ok: true,
          json: async () => initialTurns,
        };
      }

      if (url.includes("/updates")) {
        // Always return 204 (no updates)
        return {
          ok: true,
          status: 204,
          headers: {
            get: (header: string) =>
              header === "X-Session-Version" ? "0" : null,
          },
        };
      }

      return {
        ok: false,
        status: 404,
      };
    });

    const { result } = renderHook(() =>
      useSessionPolling(mockProjectId, mockSessionId),
    );

    // Wait for initial fetch
    await waitFor(() => {
      expect(result.current.isPolling).toBe(false);
    });

    // Verify state remains empty
    expect(result.current.turns).toHaveLength(0);
    expect(result.current.version).toBe(0);
    expect(result.current.hasActiveTurns).toBe(false);
  });

  it("should merge turns correctly when receiving updates", async () => {
    const mockProjectId = "test-project";
    const mockSessionId = "sess_test789";

    // First setup initial fetch
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes("/turns") && !url.includes("/turn_")) {
        return {
          ok: true,
          json: async () => ({
            turns: [
              {
                id: "turn_1",
                userPrompt: "First",
                status: "completed",
                version: 1,
                block_count: 1,
              },
            ],
          }),
        };
      }

      if (url.includes("/turns/turn_1")) {
        return {
          ok: true,
          json: async () => ({
            blocks: [],
          }),
        };
      }

      if (url.includes("/updates") && url.includes("version=0")) {
        return {
          ok: true,
          status: 204,
          headers: {
            get: (header: string) =>
              header === "X-Session-Version" ? "1" : null,
          },
        };
      }

      if (url.includes("/updates") && url.includes("version=1")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            version: 3,
            hasMore: false,
            session: {
              id: mockSessionId,
              version: 3,
              updatedAt: new Date().toISOString(),
            },
            turns: [
              {
                id: "turn_1",
                userPrompt: "First",
                status: "completed",
                version: 2,
                blockCount: 2,
                blocks: [
                  {
                    id: "block_1",
                    type: "content",
                    content: {},
                    sequenceNumber: 0,
                  },
                  {
                    id: "block_2",
                    type: "content",
                    content: {},
                    sequenceNumber: 1,
                  },
                ],
              },
              {
                id: "turn_2",
                userPrompt: "Second",
                status: "in_progress",
                version: 3,
                blockCount: 0,
                blocks: [],
              },
            ],
          }),
        };
      }

      return {
        ok: false,
        status: 404,
      };
    });

    const { result } = renderHook(() =>
      useSessionPolling(mockProjectId, mockSessionId),
    );

    // Wait for initial state
    await waitFor(() => {
      expect(result.current.turns).toHaveLength(1);
    });

    // Call refetch to get updates
    await act(async () => {
      await result.current.refetch();
    });

    // Verify merged state
    await waitFor(() => {
      expect(result.current.turns).toHaveLength(2);
    });

    expect(result.current.turns[0].blockCount).toBe(2);
    expect(result.current.turns[1].id).toBe("turn_2");
    expect(result.current.version).toBe(3);
  });

  it("should handle fetch errors gracefully", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() =>
      useSessionPolling("project-1", "session-1"),
    );

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to fetch initial session data:",
        expect.any(Error),
      );
    });

    expect(result.current.turns).toHaveLength(0);
    expect(result.current.isPolling).toBe(false);

    consoleErrorSpy.mockRestore();
  });

  it("should handle failed turns response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() =>
      useSessionPolling("project-1", "session-1"),
    );

    await waitFor(() => {
      expect(result.current.isPolling).toBe(false);
    });

    expect(result.current.turns).toHaveLength(0);
  });

  it("should provide refetch function", async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes("/turns") && !url.includes("/turn_")) {
        return {
          ok: true,
          json: async () => ({ turns: [] }),
        };
      }
      if (url.includes("/updates")) {
        return {
          ok: true,
          status: 204,
          headers: {
            get: () => "0",
          },
        };
      }
      return {
        ok: false,
        status: 404,
      };
    });

    const { result } = renderHook(() =>
      useSessionPolling("project-1", "session-1"),
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    // Call refetch
    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => {
      // Should have been called with updates endpoint for refetch
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/updates"),
        expect.any(Object),
      );
    });
  });

  it("should cleanup on unmount", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ turns: [] }),
    });

    const { unmount } = renderHook(() =>
      useSessionPolling("project-1", "session-1"),
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    unmount();

    // Should abort the controller on unmount
    expect(mockAbort).toHaveBeenCalled();
  });
});
