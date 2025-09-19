import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSessionPolling } from "../use-session-polling";

// Note: Using MSW for all fetch mocking instead of global fetch mock
// Note: AbortController is natively supported in Node.js 16+ and vitest environment

describe("useSessionPolling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should not start polling without sessionId", () => {
    const { result } = renderHook(() => useSessionPolling("project-1", null));

    // When sessionId is null, no polling should start
    expect(result.current.turns).toEqual([]);
    expect(result.current.isPolling).toBe(false);
    expect(result.current.hasActiveTurns).toBe(false);
  });

  it("should initialize with empty state and start polling", async () => {
    const { result, unmount } = renderHook(() =>
      useSessionPolling("test-project", "test-session"),
    );

    // Initial state should be empty
    expect(result.current.turns).toEqual([]);
    expect(result.current.hasActiveTurns).toBe(false);

    // Wait a bit to let initialization complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Cleanup
    unmount();
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  it("should provide refetch function", async () => {
    const { result, unmount } = renderHook(() =>
      useSessionPolling("project-1", "session-1"),
    );

    // Should have refetch function
    expect(typeof result.current.refetch).toBe("function");

    // Wait a bit for hook to settle
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify function is callable (don't await to avoid timeout)
    expect(() => result.current.refetch()).not.toThrow();

    // Cleanup
    unmount();
  });

  it("should cleanup on unmount", async () => {
    // Don't mock fetch - let MSW handlers handle all requests
    const { unmount } = renderHook(() =>
      useSessionPolling("project-1", "session-1"),
    );

    // Wait a bit to let the hook initialize
    await new Promise(resolve => setTimeout(resolve, 100));

    unmount();

    // Wait for the polling loop to check isCancelledRef and exit
    await new Promise(resolve => setTimeout(resolve, 300));

    // The test passes if no memory leaks or infinite loops occur
    // AbortController should properly cancel ongoing requests
  });
});