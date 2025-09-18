import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useSessionPolling } from "../use-session-polling";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock AbortController
const mockAbort = vi.fn();
const mockAbortController = {
  abort: mockAbort,
  signal: { aborted: false }
};

global.AbortController = vi.fn(() => mockAbortController);

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
