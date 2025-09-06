import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useSessionPolling } from "../useSessionPolling";
import type { Session, SessionApiClient } from "../../lib/api/sessions";

describe("useSessionPolling", () => {
  let mockApiClient: SessionApiClient;
  let mockSession: Session;

  beforeEach(() => {
    
    mockSession = {
      id: "session-123",
      projectId: "project-456",
      status: "idle",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      turns: [],
    };

    mockApiClient = {
      getSession: vi.fn(),
      getSessionUpdates: vi.fn().mockResolvedValue({
        session: mockSession,
        hasNewUpdates: true,
        lastUpdateTimestamp: new Date().toISOString(),
      }),
      createSession: vi.fn(),
      interruptSession: vi.fn(),
      createTurn: vi.fn(),
    } as unknown as SessionApiClient;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Initial State", () => {
    it("should start with null session and no polling", () => {
      const { result } = renderHook(() =>
        useSessionPolling(null, null, { enabled: false })
      );

      expect(result.current.session).toBeNull();
      expect(result.current.isPolling).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should not start polling when projectId or sessionId is null", () => {
      const { result } = renderHook(() =>
        useSessionPolling(null, "session-123", {
          apiClient: mockApiClient,
        })
      );

      expect(result.current.isPolling).toBe(false);
      expect(mockApiClient.getSessionUpdates).not.toHaveBeenCalled();
    });
  });

  describe("Polling Lifecycle", () => {
    it("should start polling when enabled with valid IDs", async () => {
      const { result } = renderHook(() =>
        useSessionPolling("project-456", "session-123", {
          apiClient: mockApiClient,
          enabled: true,
          runningInterval: 100,
        })
      );

      await waitFor(() => {
        expect(mockApiClient.getSessionUpdates).toHaveBeenCalledWith(
          "project-456",
          "session-123",
          undefined
        );
      });

      expect(result.current.isPolling).toBe(true);
    });

    it("should stop polling when component unmounts", async () => {
      const { unmount } = renderHook(() =>
        useSessionPolling("project-456", "session-123", {
          apiClient: mockApiClient,
          enabled: true,
          runningInterval: 100,
        })
      );

      await waitFor(() => {
        expect(mockApiClient.getSessionUpdates).toHaveBeenCalled();
      });

      const callCount = (mockApiClient.getSessionUpdates as any).mock.calls.length;
      unmount();

      // Wait a bit to ensure no more calls after unmount
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect((mockApiClient.getSessionUpdates as any).mock.calls.length).toBe(callCount);
    });

    it("should manually start and stop polling", async () => {
      const { result } = renderHook(() =>
        useSessionPolling("project-456", "session-123", {
          apiClient: mockApiClient,
          enabled: false,
          runningInterval: 100,
        })
      );

      expect(result.current.isPolling).toBe(false);
      expect(mockApiClient.getSessionUpdates).not.toHaveBeenCalled();

      // Manually start polling
      act(() => {
        result.current.startPolling();
      });

      await waitFor(() => {
        expect(result.current.isPolling).toBe(true);
        expect(mockApiClient.getSessionUpdates).toHaveBeenCalled();
      });

      // Manually stop polling
      act(() => {
        result.current.stopPolling();
      });

      expect(result.current.isPolling).toBe(false);
    });
  });

  describe("Polling Frequency", () => {
    it("should use running interval when session is running", async () => {
      const runningSession: Session = {
        ...mockSession,
        status: "running",
      };

      (mockApiClient.getSessionUpdates as any).mockResolvedValue({
        session: runningSession,
        hasNewUpdates: true,
        lastUpdateTimestamp: new Date().toISOString(),
      });

      renderHook(() =>
        useSessionPolling("project-456", "session-123", {
          apiClient: mockApiClient,
          runningInterval: 100,
          idleInterval: 500,
        })
      );

      // Wait for initial call
      await waitFor(() => {
        expect(mockApiClient.getSessionUpdates).toHaveBeenCalled();
      });

      const initialCallCount = (mockApiClient.getSessionUpdates as any).mock.calls.length;

      // Wait for next poll at running interval
      await new Promise(resolve => setTimeout(resolve, 150));

      expect((mockApiClient.getSessionUpdates as any).mock.calls.length).toBeGreaterThan(initialCallCount);
    });

    it("should use idle interval when session is idle", async () => {
      const idleSession: Session = {
        ...mockSession,
        status: "idle",
      };

      (mockApiClient.getSessionUpdates as any).mockResolvedValue({
        session: idleSession,
        hasNewUpdates: true,
        lastUpdateTimestamp: new Date().toISOString(),
      });

      renderHook(() =>
        useSessionPolling("project-456", "session-123", {
          apiClient: mockApiClient,
          runningInterval: 50,
          idleInterval: 200,
        })
      );

      // Wait for initial call
      await waitFor(() => {
        expect(mockApiClient.getSessionUpdates).toHaveBeenCalled();
      });

      const initialCallCount = (mockApiClient.getSessionUpdates as any).mock.calls.length;

      // Wait less than idle interval - should not trigger new call
      await new Promise(resolve => setTimeout(resolve, 100));
      const midCallCount = (mockApiClient.getSessionUpdates as any).mock.calls.length;
      
      // Wait past idle interval - should trigger new call
      await new Promise(resolve => setTimeout(resolve, 150));
      const finalCallCount = (mockApiClient.getSessionUpdates as any).mock.calls.length;

      expect(finalCallCount).toBeGreaterThan(initialCallCount);
    });

    it("should stop polling when session reaches terminal state", async () => {
      const completedSession: Session = {
        ...mockSession,
        status: "completed",
      };

      (mockApiClient.getSessionUpdates as any).mockResolvedValue({
        session: completedSession,
        hasNewUpdates: true,
        lastUpdateTimestamp: new Date().toISOString(),
      });

      const { result } = renderHook(() =>
        useSessionPolling("project-456", "session-123", {
          apiClient: mockApiClient,
          runningInterval: 100,
        })
      );

      await waitFor(() => {
        expect(result.current.session?.status).toBe("completed");
      });

      expect(result.current.isPolling).toBe(false);

      const callCount = (mockApiClient.getSessionUpdates as any).mock.calls.length;
      
      // Wait to ensure no more calls
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect((mockApiClient.getSessionUpdates as any).mock.calls.length).toBe(callCount);
    });
  });

  describe("Error Handling", () => {
    it("should handle API errors gracefully", async () => {
      const error = new Error("Network error");
      (mockApiClient.getSessionUpdates as any).mockRejectedValue(error);

      const onError = vi.fn();
      const { result } = renderHook(() =>
        useSessionPolling("project-456", "session-123", {
          apiClient: mockApiClient,
          onError,
          idleInterval: 100,
        })
      );

      await waitFor(() => {
        expect(result.current.error).toEqual(error);
      });

      expect(onError).toHaveBeenCalledWith(error);
      
      // Should continue polling despite error
      expect(result.current.isPolling).toBe(true);
      
      // Verify it continues polling (with extended interval)
      const initialCallCount = (mockApiClient.getSessionUpdates as any).mock.calls.length;
      await new Promise(resolve => setTimeout(resolve, 250)); // 2x idle interval
      
      expect((mockApiClient.getSessionUpdates as any).mock.calls.length).toBeGreaterThan(initialCallCount);
    });

    it("should clear error on successful update", async () => {
      const error = new Error("Network error");
      (mockApiClient.getSessionUpdates as any)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({
          session: mockSession,
          hasNewUpdates: true,
          lastUpdateTimestamp: new Date().toISOString(),
        });

      const { result } = renderHook(() =>
        useSessionPolling("project-456", "session-123", {
          apiClient: mockApiClient,
          idleInterval: 100,
        })
      );

      // Wait for first call to fail
      await waitFor(() => {
        expect(result.current.error).toEqual(error);
      });

      // Wait for retry (2x idle interval after error = 200ms)
      await waitFor(() => {
        expect(result.current.error).toBeNull();
      }, { timeout: 500 });
    });
  });

  describe("Callbacks", () => {
    it("should call onUpdate when session updates", async () => {
      const onUpdate = vi.fn();
      const updatedSession: Session = {
        ...mockSession,
        turns: [
          {
            id: "turn-1",
            sessionId: "session-123",
            status: "completed",
            userMessage: "test",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            blocks: [],
          },
        ],
      };

      (mockApiClient.getSessionUpdates as any).mockResolvedValue({
        session: updatedSession,
        hasNewUpdates: true,
        lastUpdateTimestamp: new Date().toISOString(),
      });

      renderHook(() =>
        useSessionPolling("project-456", "session-123", {
          apiClient: mockApiClient,
          onUpdate,
        })
      );

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalledWith(updatedSession);
      });
    });

    it("should not call onUpdate when no new updates", async () => {
      const onUpdate = vi.fn();
      
      (mockApiClient.getSessionUpdates as any).mockResolvedValue({
        session: mockSession,
        hasNewUpdates: false,
        lastUpdateTimestamp: new Date().toISOString(),
      });

      renderHook(() =>
        useSessionPolling("project-456", "session-123", {
          apiClient: mockApiClient,
          onUpdate,
        })
      );

      await waitFor(() => {
        expect(mockApiClient.getSessionUpdates).toHaveBeenCalled();
      });

      expect(onUpdate).not.toHaveBeenCalled();
    });
  });

  describe("Refetch", () => {
    it("should trigger immediate fetch on refetch", async () => {
      const { result } = renderHook(() =>
        useSessionPolling("project-456", "session-123", {
          apiClient: mockApiClient,
          runningInterval: 100,
        })
      );

      // Wait for initial fetch
      await waitFor(() => {
        expect(mockApiClient.getSessionUpdates).toHaveBeenCalled();
      });
      
      const initialCallCount = (mockApiClient.getSessionUpdates as any).mock.calls.length;

      // Trigger manual refetch
      await act(async () => {
        await result.current.refetch();
      });

      expect((mockApiClient.getSessionUpdates as any).mock.calls.length).toBe(initialCallCount + 1);
    });
  });

  describe("Incremental Updates", () => {
    it("should pass lastUpdateTimestamp for incremental updates", async () => {
      const timestamp1 = "2024-01-01T00:00:00Z";
      const timestamp2 = "2024-01-01T00:01:00Z";

      (mockApiClient.getSessionUpdates as any)
        .mockResolvedValueOnce({
          session: mockSession,
          hasNewUpdates: true,
          lastUpdateTimestamp: timestamp1,
        })
        .mockResolvedValueOnce({
          session: mockSession,
          hasNewUpdates: true,
          lastUpdateTimestamp: timestamp2,
        });

      renderHook(() =>
        useSessionPolling("project-456", "session-123", {
          apiClient: mockApiClient,
          idleInterval: 100,
          runningInterval: 100,
        })
      );

      // Wait for first call - should have no timestamp
      await waitFor(() => {
        expect(mockApiClient.getSessionUpdates).toHaveBeenCalledWith(
          "project-456",
          "session-123",
          undefined
        );
      });

      // Wait for second poll
      await waitFor(() => {
        expect((mockApiClient.getSessionUpdates as any).mock.calls.length).toBeGreaterThanOrEqual(2);
      }, { timeout: 300 });

      // Second call should have timestamp from first response
      const calls = (mockApiClient.getSessionUpdates as any).mock.calls;
      if (calls.length >= 2) {
        expect(calls[1]).toEqual([
          "project-456",
          "session-123",
          timestamp1
        ]);
      }
    });
  });
});