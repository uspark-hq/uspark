import { useEffect, useRef, useState, useCallback } from "react";
import type { Session, SessionApiClient } from "../lib/api/sessions";
import { sessionApi as defaultSessionApi } from "../lib/api/sessions";

export interface UseSessionPollingOptions {
  /**
   * Polling interval in milliseconds when session is running
   * @default 1000
   */
  runningInterval?: number;

  /**
   * Polling interval in milliseconds when session is idle
   * @default 5000
   */
  idleInterval?: number;

  /**
   * Whether to start polling immediately
   * @default true
   */
  enabled?: boolean;

  /**
   * Callback when session updates are received
   */
  onUpdate?: (session: Session) => void;

  /**
   * Callback when an error occurs during polling
   */
  onError?: (error: Error) => void;

  /**
   * Custom API client instance
   */
  apiClient?: SessionApiClient;
}

export interface UseSessionPollingResult {
  /**
   * Current session data
   */
  session: Session | null;

  /**
   * Current polling status
   */
  isPolling: boolean;

  /**
   * Last error that occurred during polling
   */
  error: Error | null;

  /**
   * Manually start polling
   */
  startPolling: () => void;

  /**
   * Manually stop polling
   */
  stopPolling: () => void;

  /**
   * Force an immediate poll
   */
  refetch: () => Promise<void>;
}

/**
 * Hook for polling session updates with intelligent frequency management
 *
 * @param projectId - The project ID
 * @param sessionId - The session ID to poll
 * @param options - Polling configuration options
 * @returns Session polling state and controls
 */
export function useSessionPolling(
  projectId: string | null,
  sessionId: string | null,
  options: UseSessionPollingOptions = {},
): UseSessionPollingResult {
  const {
    runningInterval = 1000,
    idleInterval = 5000,
    enabled = true,
    onUpdate,
    onError,
    apiClient = defaultSessionApi,
  } = options;

  const [session, setSession] = useState<Session | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateTimestampRef = useRef<string | null>(null);
  const isPollingRef = useRef(false);
  const isMountedRef = useRef(true);

  /**
   * Create stopPolling ref early to avoid circular dependencies
   */
  const stopPollingRef = useRef<() => void>(() => {
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }

    isPollingRef.current = false;
    setIsPolling(false);
  });

  /**
   * Calculate polling interval based on session status
   */
  const getPollingInterval = useCallback(
    (sessionStatus?: Session["status"]) => {
      if (!sessionStatus || sessionStatus === "idle") {
        return idleInterval;
      }

      if (sessionStatus === "running") {
        return runningInterval;
      }

      // For completed, failed, or interrupted sessions, stop polling
      return null;
    },
    [runningInterval, idleInterval],
  );

  /**
   * Fetch session updates
   */
  const fetchSessionUpdates = useCallback(async () => {
    if (!projectId || !sessionId || !isMountedRef.current) {
      return;
    }

    try {
      const response = await apiClient.getSessionUpdates(
        projectId,
        sessionId,
        lastUpdateTimestampRef.current || undefined,
      );

      if (!isMountedRef.current) return;

      if (response.hasNewUpdates) {
        setSession(response.session);
        lastUpdateTimestampRef.current = response.lastUpdateTimestamp;
        setError(null);

        if (onUpdate) {
          onUpdate(response.session);
        }
      }

      // Adjust polling interval based on session status
      const newInterval = getPollingInterval(response.session.status);

      if (newInterval === null) {
        // Session is in a terminal state, stop polling
        stopPollingRef.current();
      } else if (intervalIdRef.current) {
        // Clear existing interval and set new one with updated frequency
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = setInterval(fetchSessionUpdates, newInterval);
      }
    } catch (err) {
      if (!isMountedRef.current) return;

      const error =
        err instanceof Error ? err : new Error("Unknown error during polling");
      setError(error);

      if (onError) {
        onError(error);
      }

      // Continue polling even on error (network might be temporarily down)
      // But use a longer interval to avoid hammering the server
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = setInterval(
          fetchSessionUpdates,
          idleInterval * 2,
        );
      }
    }
  }, [
    projectId,
    sessionId,
    apiClient,
    onUpdate,
    onError,
    getPollingInterval,
    idleInterval,
  ]);

  /**
   * Update stopPolling ref implementation
   */
  stopPollingRef.current = () => {
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }

    isPollingRef.current = false;
    setIsPolling(false);
  };

  const stopPolling = useCallback(() => {
    stopPollingRef.current();
  }, []);

  /**
   * Start polling - using refs to avoid dependency issues
   */
  const startPollingRef = useRef<() => void>(() => {});
  startPollingRef.current = () => {
    if (!projectId || !sessionId || isPollingRef.current) {
      return;
    }

    isPollingRef.current = true;
    setIsPolling(true);

    // Initial fetch
    fetchSessionUpdates();

    // Set up interval with initial frequency
    const initialInterval = session
      ? getPollingInterval(session.status)
      : runningInterval;

    if (initialInterval !== null) {
      intervalIdRef.current = setInterval(fetchSessionUpdates, initialInterval);
    }
  };

  const startPolling = useCallback(() => {
    startPollingRef.current();
  }, []);

  /**
   * Force an immediate refetch
   */
  const refetch = useCallback(async () => {
    await fetchSessionUpdates();
  }, [fetchSessionUpdates]);

  /**
   * Effect to manage polling lifecycle
   */
  useEffect(() => {
    isMountedRef.current = true;

    if (enabled && projectId && sessionId) {
      startPollingRef.current?.();
    }

    return () => {
      isMountedRef.current = false;
      stopPollingRef.current();
    };
  }, [
    enabled,
    projectId,
    sessionId,
    session,
    fetchSessionUpdates,
    getPollingInterval,
    runningInterval,
  ]);

  /**
   * Effect to handle session status changes
   */
  useEffect(() => {
    if (!session || !isPollingRef.current) {
      return;
    }

    const newInterval = getPollingInterval(session.status);

    if (newInterval === null) {
      // Session reached terminal state
      stopPollingRef.current();
    }
  }, [session, getPollingInterval]);

  return {
    session,
    isPolling,
    error,
    startPolling,
    stopPolling,
    refetch,
  };
}

/**
 * Simplified hook for common use case
 */
export function useActiveSessionPolling(
  projectId: string | null,
  sessionId: string | null,
) {
  return useSessionPolling(projectId, sessionId, {
    runningInterval: 1000,
    idleInterval: 5000,
    enabled: true,
  });
}
