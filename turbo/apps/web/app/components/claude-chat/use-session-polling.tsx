"use client";

import { useState, useEffect, useRef } from "react";

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
  version: number;
  blockCount: number;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage?: string | null;
  blocks: Block[];
}

interface SessionUpdate {
  version: number;
  hasMore: boolean;
  session: {
    id: string;
    version: number;
    updatedAt: string;
  };
  turns: Turn[];
}

export function useSessionPolling(projectId: string, sessionId: string | null) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [version, setVersion] = useState(0);
  const [isPolling, setIsPolling] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isCancelledRef = useRef(false);

  useEffect(() => {
    if (!sessionId) return;

    isCancelledRef.current = false;

    // Start long polling
    const longPoll = async () => {
      while (!isCancelledRef.current) {
        try {
          // Cancel previous request if still pending
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
          }

          abortControllerRef.current = new AbortController();
          setIsPolling(true);

          // Long poll for updates with version tracking
          const response = await fetch(
            `/api/projects/${projectId}/sessions/${sessionId}/updates?version=${version}&timeout=30000`,
            {
              signal: abortControllerRef.current.signal,
              // Use a slightly longer timeout than server to account for network latency
              ...{ next: { revalidate: 0 } },
            },
          );

          if (!response.ok && response.status !== 204) {
            throw new Error(`Failed to fetch updates: ${response.status}`);
          }

          // 204 No Content means no updates (timeout)
          if (response.status === 204) {
            const serverVersion = response.headers.get("X-Session-Version");
            if (serverVersion) {
              const newVersion = parseInt(serverVersion, 10);
              if (newVersion > version) {
                setVersion(newVersion);
              }
            }
            continue; // Continue polling
          }

          // Parse the update response
          const update: SessionUpdate = await response.json();

          if (update.version > version) {
            // Merge turns with existing ones
            setTurns((prevTurns) => {
              const turnMap = new Map<string, Turn>();

              // Add existing turns
              prevTurns.forEach(turn => turnMap.set(turn.id, turn));

              // Update or add new turns
              update.turns.forEach(turn => {
                const existing = turnMap.get(turn.id);
                if (!existing || turn.version > existing.version) {
                  turnMap.set(turn.id, turn);
                }
              });

              return Array.from(turnMap.values()).sort((a, b) => {
                // Sort by creation time (assuming IDs are chronological)
                return a.id.localeCompare(b.id);
              });
            });

            setVersion(update.version);
          }
        } catch (error: unknown) {
          if (error instanceof Error && error.name === "AbortError") {
            // Request was aborted, this is expected
            continue;
          }

          if (!isCancelledRef.current) {
            console.error("Polling error:", error);

            // Exponential backoff on error
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        } finally {
          setIsPolling(false);
        }
      }
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
                return { ...turn, blocks: [], version: 0, blockCount: 0 };
              }

              const turnData = await turnResponse.json();
              return {
                ...turn,
                blocks: turnData.blocks || [],
                version: turn.version || 0,
                blockCount: turn.blockCount || turnData.blocks?.length || 0,
              };
            } catch {
              return { ...turn, blocks: [], version: 0, blockCount: 0 };
            }
          }),
        );

        setTurns(turnsWithBlocks);

        // Set initial version to max turn version
        const maxVersion = Math.max(0, ...turnsWithBlocks.map((t: Turn) => t.version || 0));
        setVersion(maxVersion);
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
  }, [projectId, sessionId, version]);

  const hasActiveTurns = () => {
    return turns.some(
      (turn) => turn.status === "pending" || turn.status === "in_progress",
    );
  };

  const refetch = async () => {
    if (!sessionId) return;

    try {
      const response = await fetch(
        `/api/projects/${projectId}/sessions/${sessionId}/updates?version=${version}&timeout=0`,
      );

      if (response.ok && response.status !== 204) {
        const update: SessionUpdate = await response.json();

        if (update.version > version) {
          setTurns((prevTurns) => {
            const turnMap = new Map<string, Turn>();
            prevTurns.forEach(turn => turnMap.set(turn.id, turn));
            update.turns.forEach(turn => turnMap.set(turn.id, turn));
            return Array.from(turnMap.values()).sort((a, b) => a.id.localeCompare(b.id));
          });
          setVersion(update.version);
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