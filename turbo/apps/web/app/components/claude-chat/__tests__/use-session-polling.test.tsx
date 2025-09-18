import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useSessionPolling } from "../use-session-polling";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("useSessionPolling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("should not start polling without sessionId", () => {
    renderHook(() => useSessionPolling("project-1", null));

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should fetch turns on mount with sessionId", async () => {
    const mockTurns = [
      {
        id: "turn-1",
        user_prompt: "Hello",
        status: "completed",
        started_at: "2024-01-01T00:00:00Z",
        completed_at: "2024-01-01T00:00:05Z",
        blocks: [],
      },
    ];

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ turns: mockTurns }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ blocks: [] }),
      });

    const { result } = renderHook(() =>
      useSessionPolling("project-1", "session-1"),
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/projects/project-1/sessions/session-1/turns",
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        }),
      );
    });

    expect(result.current.turns).toHaveLength(1);
    expect(result.current.turns[0].id).toBe("turn-1");
  });

  it("should fetch blocks for each turn", async () => {
    const mockTurns = [
      {
        id: "turn-1",
        user_prompt: "Hello",
        status: "completed",
        started_at: "2024-01-01T00:00:00Z",
        completed_at: "2024-01-01T00:00:05Z",
        blocks: [],
      },
    ];

    const mockBlocks = [
      {
        id: "block-1",
        type: "content",
        content: { text: "Hello there!" },
        sequence_number: 0,
      },
    ];

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ turns: mockTurns }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ blocks: mockBlocks }),
      });

    const { result } = renderHook(() =>
      useSessionPolling("project-1", "session-1"),
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/projects/project-1/sessions/session-1/turns/turn-1",
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        }),
      );
    });

    expect(result.current.turns[0].blocks).toEqual(mockBlocks);
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
        "Failed to fetch session data:",
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

  it("should handle failed blocks response gracefully", async () => {
    const mockTurns = [
      {
        id: "turn-1",
        user_prompt: "Hello",
        status: "completed",
        started_at: "2024-01-01T00:00:00Z",
        completed_at: "2024-01-01T00:00:05Z",
        blocks: [],
      },
    ];

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ turns: mockTurns }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

    const { result } = renderHook(() =>
      useSessionPolling("project-1", "session-1"),
    );

    await waitFor(() => {
      expect(result.current.turns).toHaveLength(1);
    });

    // Turn should exist but with empty blocks
    expect(result.current.turns[0].blocks).toHaveLength(0);
  });

  it("should use faster polling interval for active turns", async () => {
    const mockActiveTurns = [
      {
        id: "turn-1",
        user_prompt: "Hello",
        status: "in_progress",
        started_at: "2024-01-01T00:00:00Z",
        completed_at: null,
        blocks: [],
      },
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ turns: mockActiveTurns, blocks: [] }),
    });

    renderHook(() => useSessionPolling("project-1", "session-1"));

    // Wait for initial fetch
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2); // turns + blocks
    });

    // Fast forward 1 second (should trigger poll for active turns)
    vi.advanceTimersByTime(1000);

    await vi.waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(4); // Initial + one poll cycle
    });
  });

  it("should use slower polling interval for inactive turns", async () => {
    const mockInactiveTurns = [
      {
        id: "turn-1",
        user_prompt: "Hello",
        status: "completed",
        started_at: "2024-01-01T00:00:00Z",
        completed_at: "2024-01-01T00:00:05Z",
        blocks: [],
      },
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ turns: mockInactiveTurns, blocks: [] }),
    });

    renderHook(() => useSessionPolling("project-1", "session-1"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    // Fast forward 1 second (should not trigger poll for inactive turns)
    vi.advanceTimersByTime(1000);
    expect(mockFetch).toHaveBeenCalledTimes(2);

    // Fast forward 4 more seconds (total 5 seconds, should trigger poll)
    vi.advanceTimersByTime(4000);

    await vi.waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });
  });

  it("should adjust polling rate when turn status changes", async () => {
    let callCount = 0;
    const mockResponses = [
      // First response: active turn
      {
        turns: [
          {
            id: "turn-1",
            user_prompt: "Hello",
            status: "in_progress",
            started_at: "2024-01-01T00:00:00Z",
            completed_at: null,
            blocks: [],
          },
        ],
      },
      // Second response: completed turn
      {
        turns: [
          {
            id: "turn-1",
            user_prompt: "Hello",
            status: "completed",
            started_at: "2024-01-01T00:00:00Z",
            completed_at: "2024-01-01T00:00:05Z",
            blocks: [],
          },
        ],
      },
    ];

    mockFetch.mockImplementation(() => {
      const response =
        mockResponses[Math.min(callCount, mockResponses.length - 1)];
      callCount++;
      if (callCount % 2 === 1) {
        // Odd calls are for turns
        return Promise.resolve({
          ok: true,
          json: async () => response,
        });
      } else {
        // Even calls are for blocks
        return Promise.resolve({
          ok: true,
          json: async () => ({ blocks: [] }),
        });
      }
    });

    renderHook(() => useSessionPolling("project-1", "session-1"));

    // Wait for initial fetch
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    // Advance 1 second - should poll because turn is active
    vi.advanceTimersByTime(1000);

    await vi.waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    // Now turn is completed, should restart with 5-second interval
    // Advance 1 second - should not poll
    vi.advanceTimersByTime(1000);
    expect(mockFetch).toHaveBeenCalledTimes(4);

    // Advance 4 more seconds (total 5) - should poll
    vi.advanceTimersByTime(4000);

    await vi.waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(6);
    });
  });

  it("should cancel previous request when new request starts", async () => {
    const abortSpy = vi.fn();
    const originalAbortController = global.AbortController;

    global.AbortController = vi.fn().mockImplementation(() => ({
      abort: abortSpy,
      signal: { aborted: false },
    }));

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ turns: [], blocks: [] }),
    });

    const { result } = renderHook(() =>
      useSessionPolling("project-1", "session-1"),
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // Trigger refetch
    result.current.refetch();

    expect(abortSpy).toHaveBeenCalled();

    global.AbortController = originalAbortController;
  });

  it("should clean up on unmount", async () => {
    const abortSpy = vi.fn();
    const clearIntervalSpy = vi.spyOn(global, "clearInterval");
    const originalAbortController = global.AbortController;

    global.AbortController = vi.fn().mockImplementation(() => ({
      abort: abortSpy,
      signal: { aborted: false },
    }));

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ turns: [], blocks: [] }),
    });

    const { unmount } = renderHook(() =>
      useSessionPolling("project-1", "session-1"),
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    expect(abortSpy).toHaveBeenCalled();

    global.AbortController = originalAbortController;
    clearIntervalSpy.mockRestore();
  });

  it("should not log AbortError in console", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const abortError = new Error("Aborted");
    abortError.name = "AbortError";

    mockFetch.mockRejectedValueOnce(abortError);

    renderHook(() => useSessionPolling("project-1", "session-1"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    expect(consoleErrorSpy).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("should provide refetch function", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ turns: [], blocks: [] }),
    });

    const { result } = renderHook(() =>
      useSessionPolling("project-1", "session-1"),
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    // Call refetch
    result.current.refetch();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
