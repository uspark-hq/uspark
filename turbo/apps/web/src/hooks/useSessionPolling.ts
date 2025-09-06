import { useEffect, useRef, useState, useCallback } from 'react';
import { sessionsAPI, type Session, type Turn, type Block } from '../lib/api/sessions';

interface UseSessionPollingOptions {
  projectId: string;
  sessionId?: string;
  enabled?: boolean;
  onUpdate?: (session: Session) => void;
  onError?: (error: Error) => void;
}

export function useSessionPolling({
  projectId,
  sessionId,
  enabled = true,
  onUpdate,
  onError,
}: UseSessionPollingOptions) {
  const [session, setSession] = useState<Session | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchSession = useCallback(async () => {
    if (!sessionId || !enabled) return;

    try {
      // Fetch full session data with turns and blocks
      const data = await sessionsAPI.getFullSession(projectId, sessionId);
      setSession(data);
      setError(null);
      
      if (onUpdate) {
        onUpdate(data);
      }

      // Check if all turns are completed/failed
      const hasActiveTurns = data.turns?.some(
        turn => turn.status === 'pending' || turn.status === 'running'
      ) ?? false;
      
      // Stop polling if no active turns
      if (!hasActiveTurns && data.turns && data.turns.length > 0) {
        stopPolling();
      }
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error);
      
      if (onError) {
        onError(error);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, sessionId, enabled, onUpdate, onError]);

  const startPolling = useCallback(() => {
    if (!sessionId || !enabled || isPolling) return;
    
    setIsPolling(true);
    
    // Fetch immediately
    fetchSession();
    
    // Then poll every second for running sessions
    intervalRef.current = setInterval(() => {
      fetchSession();
    }, 1000);
  }, [sessionId, enabled, isPolling, fetchSession]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    setIsPolling(false);
  }, []);

  // Start/stop polling based on sessionId and enabled state
  useEffect(() => {
    if (sessionId && enabled) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, enabled]);

  // Public API for manual control
  const refresh = useCallback(() => {
    fetchSession();
  }, [fetchSession]);

  const interruptSession = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      await sessionsAPI.interruptSession(projectId, sessionId);
      
      // Refresh session state
      await fetchSession();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to interrupt session');
      setError(error);
      
      if (onError) {
        onError(error);
      }
    }
  }, [projectId, sessionId, fetchSession, onError]);

  return {
    session,
    isPolling,
    error,
    refresh,
    interruptSession,
    startPolling,
    stopPolling,
  };
}