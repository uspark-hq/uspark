import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
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

  it("should cleanup intervals and abort controllers on unmount", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ turns: [] }),
    });

    const { unmount } = renderHook(() =>
      useSessionPolling("project-1", "session-1"),
    );

    // Wait a bit to ensure the hook has initialized
    await new Promise(resolve => setTimeout(resolve, 10));

    // Unmount should trigger cleanup
    unmount();

    // AbortController should be called to cancel any pending requests
    expect(mockAbort).toHaveBeenCalled();
  });

  it("should provide refetch function", () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ turns: [] }),
    });

    const { result } = renderHook(() =>
      useSessionPolling("project-1", "session-1"),
    );

    expect(typeof result.current.refetch).toBe("function");
  });
});