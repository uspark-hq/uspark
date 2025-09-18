"use client";

import { useState, useEffect, useRef } from "react";

interface Block {
  id: string;
  type: string;
  content: Record<string, unknown>;
  sequence_number: number;
}

interface Turn {
  id: string;
  user_prompt: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  started_at: string | null;
  completed_at: string | null;
  blocks: Block[];
}

export function useSessionPolling(projectId: string, sessionId: string | null) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const fetchTurnsLocal = async () => {
      await fetchTurns();
    };

    const startPollingLocal = () => {
      startPolling();
    };

    // Initial fetch
    fetchTurnsLocal();

    // Start polling
    startPollingLocal();

    return () => {
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, sessionId]);

  const startPolling = () => {
    // Poll every second when there are active turns, every 5 seconds otherwise
    const pollInterval = hasActiveTurns() ? 1000 : 5000;

    intervalRef.current = setInterval(() => {
      fetchTurns();
    }, pollInterval);
  };

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const hasActiveTurns = () => {
    return turns.some(
      (turn) => turn.status === "pending" || turn.status === "in_progress",
    );
  };

  const fetchTurns = async () => {
    if (!sessionId) return;

    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsPolling(true);

    try {
      // Fetch all turns for the session
      const turnsResponse = await fetch(
        `/api/projects/${projectId}/sessions/${sessionId}/turns`,
        {
          signal: abortControllerRef.current.signal,
        },
      );

      if (!turnsResponse.ok) {
        throw new Error("Failed to fetch turns");
      }

      const turnsData = await turnsResponse.json();
      const allTurns = turnsData.turns || [];

      // Fetch blocks for each turn
      const turnsWithBlocks = await Promise.all(
        allTurns.map(async (turn: Turn) => {
          try {
            const turnResponse = await fetch(
              `/api/projects/${projectId}/sessions/${sessionId}/turns/${turn.id}`,
              {
                signal: abortControllerRef.current?.signal,
              },
            );

            if (!turnResponse.ok) {
              return { ...turn, blocks: [] };
            }

            const turnData = await turnResponse.json();
            return {
              ...turn,
              blocks: turnData.blocks || [],
            };
          } catch {
            // If fetching blocks fails, return turn without blocks
            return { ...turn, blocks: [] };
          }
        }),
      );

      setTurns(turnsWithBlocks);

      // Adjust polling rate based on activity
      if (hasActiveTurns() && intervalRef.current) {
        stopPolling();
        startPolling();
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("Failed to fetch session data:", error);
      }
    } finally {
      // Only update state if the request wasn't aborted
      if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
        setIsPolling(false);
      }
    }
  };

  return {
    turns,
    isPolling,
    refetch: fetchTurns,
  };
}
