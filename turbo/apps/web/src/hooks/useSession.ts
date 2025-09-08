import { useState, useEffect, useCallback, useRef } from "react";
import { sessionAPI, SessionPoller } from "../lib/api/sessions";
import type { Session } from "../db/schema/sessions";
import type { TurnWithBlocks, SessionUpdates } from "../components/chat/types";

/**
 * Hook for managing a chat session with real-time updates
 */
export function useSession(projectId: string, sessionId?: string) {
  const [session, setSession] = useState<Session | null>(null);
  const [turns, setTurns] = useState<TurnWithBlocks[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isSending, setIsSending] = useState(false);

  const pollerRef = useRef<SessionPoller | null>(null);

  // Load session and turns
  useEffect(() => {
    if (!sessionId) {
      setIsLoading(false);
      return;
    }

    const loadSession = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load session details and turns in parallel
        const [sessionData, turnsData] = await Promise.all([
          sessionAPI.getSession(projectId, sessionId),
          sessionAPI.getTurns(projectId, sessionId),
        ]);

        setSession(sessionData);
        setTurns(turnsData);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, [projectId, sessionId]);

  // Handle real-time updates
  const handleUpdates = useCallback(
    (updates: SessionUpdates) => {
      // Update session timestamp
      setSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          updatedAt: new Date(updates.session.updated_at),
        };
      });

      // Update turns with new data
      if (updates.updated_turns) {
        updates.updated_turns.forEach((turnUpdate) => {
          setTurns((prevTurns) => {
            const existingIndex = prevTurns.findIndex(
              (t) => t.id === turnUpdate.id,
            );

            if (existingIndex === -1) {
              // New turn, fetch full data
              sessionAPI
                .getTurn(projectId, sessionId!, turnUpdate.id)
                .then((fullTurn) => {
                  setTurns((prev) => {
                    const index = prev.findIndex((t) => t.id === fullTurn.id);
                    if (index === -1) {
                      return [...prev, fullTurn];
                    }
                    return prev;
                  });
                });
              return prevTurns;
            }

            // Update existing turn
            const updatedTurns = [...prevTurns];
            const existing = updatedTurns[existingIndex];

            // Fetch the updated turn data if status changed or new blocks added
            if (
              existing &&
              (existing.status !== turnUpdate.status ||
                existing.blockCount !== turnUpdate.blockCount)
            ) {
              sessionAPI
                .getTurn(projectId, sessionId!, turnUpdate.id)
                .then((fullTurn) => {
                  setTurns((prev) => {
                    const index = prev.findIndex((t) => t.id === fullTurn.id);
                    if (index !== -1) {
                      const updated = [...prev];
                      updated[index] = fullTurn;
                      return updated;
                    }
                    return prev;
                  });
                });
            }

            return updatedTurns;
          });
        });
      }
    },
    [projectId, sessionId],
  );

  // Start/stop polling based on active turns
  useEffect(() => {
    if (!sessionId) return;

    const hasActiveTurns = turns.some((t) => t.status === "running");

    if (hasActiveTurns && !pollerRef.current?.isRunning()) {
      pollerRef.current = new SessionPoller(
        projectId,
        sessionId,
        handleUpdates,
        (err) => console.error("Polling error:", err),
        1000, // Poll every second
      );
      pollerRef.current.start();
    } else if (!hasActiveTurns && pollerRef.current?.isRunning()) {
      pollerRef.current.stop();
    }

    return () => {
      pollerRef.current?.stop();
    };
  }, [projectId, sessionId, turns, handleUpdates]);

  // Create a new session
  const createSession = useCallback(
    async (title?: string) => {
      try {
        setError(null);
        const newSession = await sessionAPI.createSession(projectId, title);
        setSession(newSession);
        setTurns([]);
        return newSession;
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [projectId],
  );

  // Send a message (create a new turn)
  const sendMessage = useCallback(
    async (message: string) => {
      if (!sessionId || isSending) return;

      try {
        setIsSending(true);
        setError(null);

        const newTurn = await sessionAPI.createTurn(
          projectId,
          sessionId,
          message,
        );

        // Add the new turn to the list
        setTurns((prev) => [...prev, newTurn]);

        // Start polling for updates
        if (!pollerRef.current?.isRunning()) {
          pollerRef.current = new SessionPoller(
            projectId,
            sessionId,
            handleUpdates,
            (err) => console.error("Polling error:", err),
            1000,
          );
          pollerRef.current.start();
        }

        return newTurn;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsSending(false);
      }
    },
    [projectId, sessionId, isSending, handleUpdates],
  );

  // Interrupt the session
  const interruptSession = useCallback(async () => {
    if (!sessionId) return;

    try {
      setError(null);
      const result = await sessionAPI.interruptSession(projectId, sessionId);

      // Update the status of interrupted turns
      setTurns((prev) =>
        prev.map((turn) => {
          if (result.interrupted_turn_ids.includes(turn.id)) {
            return {
              ...turn,
              status: "interrupted" as const,
              completedAt: new Date().toISOString(),
              errorMessage: "User interrupted",
            };
          }
          return turn;
        }),
      );

      // Stop polling
      pollerRef.current?.stop();

      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [projectId, sessionId]);

  // Update session title
  const updateTitle = useCallback(
    async (title: string) => {
      if (!sessionId) return;

      try {
        setError(null);
        const updated = await sessionAPI.updateSession(projectId, sessionId, {
          title,
        });
        setSession(updated);
        return updated;
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [projectId, sessionId],
  );

  return {
    // State
    session,
    turns,
    isLoading,
    error,
    isSending,

    // Computed
    currentTurn: turns.find((t) => t.status === "running"),
    hasActiveTurns: turns.some((t) => t.status === "running"),

    // Actions
    createSession,
    sendMessage,
    interruptSession,
    updateTitle,
    reload: () => {
      if (sessionId) {
        setIsLoading(true);
        Promise.all([
          sessionAPI.getSession(projectId, sessionId),
          sessionAPI.getTurns(projectId, sessionId),
        ])
          .then(([sessionData, turnsData]) => {
            setSession(sessionData);
            setTurns(turnsData);
            setIsLoading(false);
          })
          .catch((err) => {
            setError(err);
            setIsLoading(false);
          });
      }
    },
  };
}
