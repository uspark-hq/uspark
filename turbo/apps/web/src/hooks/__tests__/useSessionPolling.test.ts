import { describe, it, expect, vi, beforeEach, afterEach, MockedFunction } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSessionPolling } from '../useSessionPolling';
import { mockSession } from '../../test/mocks/sessions';

// Mock fetch globally
const mockFetch = vi.fn() as MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('useSessionPolling', () => {
  const mockProjectId = 'project-123';
  const mockSessionId = 'session-456';
  
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });

  it('should not poll when sessionId is not provided', () => {
    const { result } = renderHook(() =>
      useSessionPolling({
        projectId: mockProjectId,
        sessionId: undefined,
        enabled: true,
      })
    );

    expect(result.current.session).toBeNull();
    expect(result.current.isPolling).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should not poll when enabled is false', () => {
    const { result } = renderHook(() =>
      useSessionPolling({
        projectId: mockProjectId,
        sessionId: mockSessionId,
        enabled: false,
      })
    );

    expect(result.current.session).toBeNull();
    expect(result.current.isPolling).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should start polling when sessionId and enabled are provided', async () => {
    const runningSession = mockSession.running(mockProjectId);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => runningSession,
    } as Response);

    const { result } = renderHook(() =>
      useSessionPolling({
        projectId: mockProjectId,
        sessionId: mockSessionId,
        enabled: true,
      })
    );

    // Initial fetch should happen immediately
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/projects/${mockProjectId}/sessions/${mockSessionId}`,
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );
    });

    expect(result.current.session).toEqual(runningSession);
    expect(result.current.isPolling).toBe(true);
  });

  it('should poll every second for running sessions', async () => {
    const runningSession = mockSession.running(mockProjectId);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => runningSession,
    } as Response);

    renderHook(() =>
      useSessionPolling({
        projectId: mockProjectId,
        sessionId: mockSessionId,
        enabled: true,
      })
    );

    // Initial fetch
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Advance timer by 1 second
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    // Advance timer by another second
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  it('should stop polling when session is completed', async () => {
    const completedSession = mockSession.completed(mockProjectId);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => completedSession,
    } as Response);

    const { result } = renderHook(() =>
      useSessionPolling({
        projectId: mockProjectId,
        sessionId: mockSessionId,
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(result.current.session).toEqual(completedSession);
    });

    // Advance timer to verify no more polling
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Should still be called only once (initial fetch)
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.current.isPolling).toBe(false);
  });

  it('should stop polling when session fails', async () => {
    const failedSession = mockSession.failed(mockProjectId);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => failedSession,
    } as Response);

    const { result } = renderHook(() =>
      useSessionPolling({
        projectId: mockProjectId,
        sessionId: mockSessionId,
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(result.current.session).toEqual(failedSession);
    });

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.current.isPolling).toBe(false);
  });

  it('should stop polling when session is interrupted', async () => {
    const interruptedSession = mockSession.interrupted(mockProjectId);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => interruptedSession,
    } as Response);

    const { result } = renderHook(() =>
      useSessionPolling({
        projectId: mockProjectId,
        sessionId: mockSessionId,
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(result.current.session).toEqual(interruptedSession);
    });

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.current.isPolling).toBe(false);
  });

  it('should handle fetch errors', async () => {
    const mockError = new Error('Network error');
    const onError = vi.fn();
    mockFetch.mockRejectedValueOnce(mockError);

    const { result } = renderHook(() =>
      useSessionPolling({
        projectId: mockProjectId,
        sessionId: mockSessionId,
        enabled: true,
        onError,
      })
    );

    await waitFor(() => {
      expect(result.current.error).toEqual(mockError);
    });

    expect(onError).toHaveBeenCalledWith(mockError);
    expect(result.current.session).toBeNull();
  });

  it('should handle HTTP errors', async () => {
    const onError = vi.fn();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Not Found',
    } as Response);

    const { result } = renderHook(() =>
      useSessionPolling({
        projectId: mockProjectId,
        sessionId: mockSessionId,
        enabled: true,
        onError,
      })
    );

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.error?.message).toContain('Failed to fetch session');
    expect(onError).toHaveBeenCalled();
  });

  it('should call onUpdate callback when session updates', async () => {
    const onUpdate = vi.fn();
    const runningSession = mockSession.running(mockProjectId);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => runningSession,
    } as Response);

    renderHook(() =>
      useSessionPolling({
        projectId: mockProjectId,
        sessionId: mockSessionId,
        enabled: true,
        onUpdate,
      })
    );

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith(runningSession);
    });
  });

  it('should support manual refresh', async () => {
    const runningSession = mockSession.running(mockProjectId);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => runningSession,
    } as Response);

    const { result } = renderHook(() =>
      useSessionPolling({
        projectId: mockProjectId,
        sessionId: mockSessionId,
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    // Manually refresh
    act(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  it('should support interrupting session', async () => {
    const runningSession = mockSession.running(mockProjectId);
    const interruptedSession = mockSession.interrupted(mockProjectId);
    
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => runningSession,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => {},
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => interruptedSession,
      } as Response);

    const { result } = renderHook(() =>
      useSessionPolling({
        projectId: mockProjectId,
        sessionId: mockSessionId,
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(result.current.session).toEqual(runningSession);
    });

    // Interrupt the session
    await act(async () => {
      await result.current.interruptSession();
    });

    expect(mockFetch).toHaveBeenCalledWith(
      `/api/projects/${mockProjectId}/sessions/${mockSessionId}/interrupt`,
      expect.objectContaining({
        method: 'POST',
      })
    );

    await waitFor(() => {
      expect(result.current.session).toEqual(interruptedSession);
    });
  });

  it('should cleanup on unmount', async () => {
    const runningSession = mockSession.running(mockProjectId);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => runningSession,
    } as Response);

    const { unmount } = renderHook(() =>
      useSessionPolling({
        projectId: mockProjectId,
        sessionId: mockSessionId,
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    unmount();

    // Advance timer after unmount
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Should not poll after unmount
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should stop polling when enabled changes to false', async () => {
    const runningSession = mockSession.running(mockProjectId);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => runningSession,
    } as Response);

    const { result, rerender } = renderHook(
      ({ enabled }) =>
        useSessionPolling({
          projectId: mockProjectId,
          sessionId: mockSessionId,
          enabled,
        }),
      {
        initialProps: { enabled: true },
      }
    );

    await waitFor(() => {
      expect(result.current.isPolling).toBe(true);
    });

    // Disable polling
    rerender({ enabled: false });

    await waitFor(() => {
      expect(result.current.isPolling).toBe(false);
    });

    const callCount = mockFetch.mock.calls.length;

    // Advance timer
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Should not poll when disabled
    expect(mockFetch).toHaveBeenCalledTimes(callCount);
  });
});