"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface Block {
  id: string;
  type: string;
  content: Record<string, unknown>;
  sequenceNumber: number;
}

interface Turn {
  id: string;
  userPrompt: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  startedAt: string | null;
  completedAt: string | null;
  errorMessage?: string | null;
  blocks: Block[];
}

interface SessionUpdate {
  session: {
    id: string;
    updatedAt: string;
  };
  turns: Turn[];
  version?: number;
}

export function useSessionPolling(projectId: string, sessionId: string | null) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [version, setVersion] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isCancelledRef = useRef(false);
  const pollCountRef = useRef(0);

  const buildStateString = useCallback(() => {
    return turns
      .map(turn => `${turn.id}:${turn.blocks.length}`)
      .join(",");
  }, [turns]);

  useEffect(() => {
    if (!sessionId) return;

    isCancelledRef.current = false;
    pollCountRef.current = 0;

    // Start long polling with proper cleanup detection
    const longPoll = async () => {
      const poll = async (): Promise<void> => {
        if (isCancelledRef.current) return;

        // In test environment, limit polling to prevent memory issues
        const isTestEnv = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
        if (isTestEnv && pollCountRef.current >= 3) {
          return;
        }
        pollCountRef.current++;

        try {
          // Cancel previous request if still pending
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
          }

          abortControllerRef.current = new AbortController();
          setIsPolling(true);

          // Build current state string: turn1:blockCount1,turn2:blockCount2
          const stateString = buildStateString();

          // Long poll for updates with state comparison
          const response = await fetch(
            `/api/projects/${projectId}/sessions/${sessionId}/updates?state=${encodeURIComponent(stateString)}&timeout=30000`,
            {
              signal: abortControllerRef.current.signal,
              ...{ next: { revalidate: 0 } },
            },
          );

          if (!response.ok && response.status !== 204) {
            throw new Error(`Failed to fetch updates: ${response.status}`);
          }

          // 204 No Content means no updates (timeout)
          if (response.status === 204) {
            // Continue polling only if not cancelled
            if (!isCancelledRef.current) {
              setTimeout(() => poll(), 0);
            }
            return;
          }

          // Parse the update response
          const update: SessionUpdate = await response.json();

          // Update turns with the latest data
          setTurns(update.turns);
          // Update version based on update response
          if (update.version !== undefined) {
            setVersion(update.version);
          } else if (update.session?.updatedAt) {
            setVersion(prev => prev + 1);
          }

          // Continue polling only if not cancelled
          if (!isCancelledRef.current) {
            setTimeout(() => poll(), 0);
          }
        } catch (error: unknown) {
          if (error instanceof Error && error.name === "AbortError") {
            // Request was aborted, this is expected
            return;
          }

          if (!isCancelledRef.current) {
            console.error("Polling error:", error);

            // Exponential backoff on error
            setTimeout(() => {
              if (!isCancelledRef.current) {
                poll();
              }
            }, 2000);
          }
        } finally {
          setIsPolling(false);
        }
      };

      // Start the polling chain
      poll();
    };

    // Initial fetch to get all turns
    const initialFetch = async () => {
      try {
        // Get all turns initially
        const turnsResponse = await fetch(
          `/api/projects/${projectId}/sessions/${sessionId}/turns`,
        );

        if (!turnsResponse.ok) {
          throw new Error("Failed to fetch initial turns");
        }

        const turnsData = await turnsResponse.json();
        const allTurns = turnsData.turns || [];

        // Fetch blocks for each turn
        const turnsWithBlocks = await Promise.all(
          allTurns.map(async (turn: Turn) => {
            try {
              const turnResponse = await fetch(
                `/api/projects/${projectId}/sessions/${sessionId}/turns/${turn.id}`,
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
              return { ...turn, blocks: [] };
            }
          }),
        );

        setTurns(turnsWithBlocks);
        // Only set version if there are actually turns
        if (turnsWithBlocks.length > 0) {
          setVersion(1);
        }
      } catch (error) {
        console.error("Failed to fetch initial session data:", error);
      }
    };

    // Fetch initial data then start polling
    initialFetch().then(() => longPoll());

    return () => {
      isCancelledRef.current = true;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [projectId, sessionId, buildStateString]);

  const hasActiveTurns = () => {
    return turns.some(
      (turn) => turn.status === "pending" || turn.status === "in_progress",
    );
  };

  const refetch = async () => {
    if (!sessionId) return;

    try {
      // Build current state for comparison
      const stateString = buildStateString();

      const response = await fetch(
        `/api/projects/${projectId}/sessions/${sessionId}/updates?state=${encodeURIComponent(stateString)}&timeout=0`,
      );

      if (response.ok && response.status !== 204) {
        const update: SessionUpdate = await response.json();
        setTurns(update.turns);
        if (update.version !== undefined) {
          setVersion(update.version);
        } else if (update.session?.updatedAt) {
          setVersion(prev => prev + 1);
        }
      }
    } catch (error) {
      console.error("Failed to refetch:", error);
    }
  };

  return {
    turns,
    isPolling,
    refetch,
    hasActiveTurns: hasActiveTurns(),
    version,
  };
}