"use client";

import { useState, useEffect, useRef } from "react";
import { useSessionPolling } from "./use-session-polling";
import { BlockDisplay } from "./block-display";
import { SessionSelector } from "./session-selector";
import { useActiveTodos } from "./use-active-todos";
import { ActiveTodosDisplay } from "./active-todos-display";

// Local Block type used by this component
interface LocalBlock {
  id: string;
  type: string;
  content: Record<string, unknown>;
}

/**
 * Filters blocks for display in the UI.
 * Rules:
 * - Hide all tool_use blocks
 * - Keep only the last tool_result block (if multiple exist)
 * - Keep all other block types
 */
function filterBlocksForDisplay(blocks: LocalBlock[]): LocalBlock[] {
  if (!blocks || blocks.length === 0) {
    return blocks;
  }

  const filtered: LocalBlock[] = [];
  let lastToolResultIndex = -1;

  // First pass: Find the last tool_result index
  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i];
    if (!block) continue;
    if (block.type === "tool_result") {
      lastToolResultIndex = i;
      break;
    }
  }

  // Second pass: Apply filtering rules
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (!block) continue;

    // Hide all tool_use blocks
    if (block.type === "tool_use") {
      continue;
    }

    // Keep only the last tool_result
    if (block.type === "tool_result") {
      if (i === lastToolResultIndex) {
        filtered.push(block);
      }
      continue;
    }

    // Keep all other block types
    filtered.push(block);
  }

  return filtered;
}

interface ChatInterfaceProps {
  projectId: string;
}

export function ChatInterface({ projectId }: ChatInterfaceProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Poll for session updates
  const { turns, isPolling } = useSessionPolling(projectId, sessionId);

  // Get active todos from the last in-progress turn
  const activeTodos = useActiveTodos(turns);

  // Initialize or get existing session
  useEffect(() => {
    const initializeSession = async () => {
      try {
        // First, try to get existing sessions
        const listResponse = await fetch(`/api/projects/${projectId}/sessions`);

        if (listResponse.ok) {
          const data = await listResponse.json();
          const sessions = data.sessions || [];

          // If there are existing sessions, use the most recent one
          if (sessions.length > 0) {
            // Sessions are typically returned sorted by createdAt desc, so first is most recent
            const mostRecentSession = sessions[0];
            setSessionId(mostRecentSession.id);
            console.log("Using existing session:", mostRecentSession.id);
            return;
          }
        }

        // No existing sessions, don't create one automatically
        console.log("No existing sessions found");
      } catch {
        setError("Failed to connect to server. Please check your connection.");
      }
    };

    // Only initialize on first mount
    if (!sessionId) {
      initializeSession();
    }
  }, [projectId, sessionId]);

  // Handle session change from selector
  const handleSessionChange = (newSessionId: string) => {
    setSessionId(newSessionId);
    setMessage(""); // Clear input when switching sessions
    setError(null);
  };

  // Handle creating a new session
  const handleNewSession = async () => {
    try {
      const now = new Date();
      const timestamp = now.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      const response = await fetch(`/api/projects/${projectId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: `Claude Session - ${timestamp}` }),
      });

      if (response.ok) {
        const session = await response.json();
        setSessionId(session.id);
        console.log("Created new session:", session.id);
      } else {
        setError("Failed to create new session. Please try again.");
      }
    } catch {
      setError("Failed to create new session. Please check your connection.");
    }
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  const handleSubmit = async () => {
    if (!message.trim() || !sessionId || isSubmitting) return;

    setIsSubmitting(true);
    setError(null); // Clear any previous errors
    const userMessage = message;
    setMessage("");

    try {
      // Create a new turn using the real API
      const response = await fetch(
        `/api/projects/${projectId}/sessions/${sessionId}/turns`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_message: userMessage }),
        },
      );

      if (!response.ok) {
        if (response.status === 401) {
          setError("You are not authorized. Please log in again.");
        } else if (response.status === 404) {
          setError("Session not found. Please refresh the page.");
        } else if (response.status >= 500) {
          setError("Server error. Please try again later.");
        } else {
          setError("Failed to send message. Please try again.");
        }
        throw new Error("Failed to execute");
      }

      // Polling will automatically pick up the new turn
    } catch (err) {
      console.error("Failed to send message:", err);
      setMessage(userMessage); // Restore message on error
      if (!error) {
        // Only set error if not already set above
        setError("Network error. Please check your connection and try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/* Session Selector Header */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid rgba(156, 163, 175, 0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <SessionSelector
          projectId={projectId}
          currentSessionId={sessionId}
          onSessionChange={handleSessionChange}
          onNewSession={handleNewSession}
        />
        {sessionId && (
          <div
            style={{
              fontSize: "12px",
              color: "rgba(156, 163, 175, 0.6)",
              padding: "4px 8px",
              backgroundColor: "rgba(156, 163, 175, 0.05)",
              borderRadius: "4px",
            }}
          >
            {turns.length} {turns.length === 1 ? "message" : "messages"}
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {!sessionId ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "rgba(156, 163, 175, 0.6)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>💬</div>
            <h3 style={{ marginBottom: "8px", color: "var(--foreground)" }}>
              Select or create a session
            </h3>
            <p style={{ maxWidth: "400px", fontSize: "14px" }}>
              Choose an existing session from the dropdown above or create a new
              one to start chatting with Claude.
            </p>
          </div>
        ) : turns.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "rgba(156, 163, 175, 0.6)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🤖</div>
            <h3 style={{ marginBottom: "8px", color: "var(--foreground)" }}>
              Start a conversation with Claude
            </h3>
            <p style={{ maxWidth: "400px", fontSize: "14px" }}>
              Ask Claude to help you with your code. Try asking to analyze
              files, write new functions, or fix bugs.
            </p>
          </div>
        ) : (
          <>
            {turns.map((turn) => (
              <div key={turn.id} style={{ marginBottom: "24px" }}>
                {/* User Message */}
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    marginBottom: "16px",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      backgroundColor: "#3b82f6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: "14px",
                      flexShrink: 0,
                    }}
                  ></div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontWeight: "500",
                        marginBottom: "4px",
                        fontSize: "14px",
                      }}
                    >
                      You
                    </div>
                    <div
                      style={{
                        backgroundColor: "rgba(156, 163, 175, 0.05)",
                        padding: "12px",
                        borderRadius: "8px",
                        fontSize: "14px",
                      }}
                    >
                      {turn.userPrompt}
                    </div>
                  </div>
                </div>

                {/* Claude Response */}
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      backgroundColor: "#9333ea",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: "14px",
                      flexShrink: 0,
                    }}
                  ></div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontWeight: "500",
                        marginBottom: "4px",
                        fontSize: "14px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      Claude
                      {turn.status === "in_progress" && (
                        <span
                          style={{
                            fontSize: "11px",
                            padding: "2px 6px",
                            backgroundColor: "rgba(59, 130, 246, 0.1)",
                            color: "#3b82f6",
                            borderRadius: "4px",
                          }}
                        >
                          Thinking...
                        </span>
                      )}
                      {turn.status === "failed" && (
                        <span
                          style={{
                            fontSize: "11px",
                            padding: "2px 6px",
                            backgroundColor: "rgba(239, 68, 68, 0.1)",
                            color: "#ef4444",
                            borderRadius: "4px",
                          }}
                        >
                          Failed
                        </span>
                      )}
                    </div>

                    {/* Display blocks */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      {turn.blocks && turn.blocks.length > 0 ? (
                        filterBlocksForDisplay(turn.blocks).map((block) => (
                          <BlockDisplay key={block.id} block={block} />
                        ))
                      ) : turn.status === "in_progress" ? (
                        <div
                          style={{
                            padding: "12px",
                            backgroundColor: "rgba(156, 163, 175, 0.05)",
                            borderRadius: "8px",
                            fontSize: "14px",
                            color: "rgba(156, 163, 175, 0.6)",
                          }}
                        >
                          <span className="loading-dots">Processing</span>
                        </div>
                      ) : turn.status === "pending" ? (
                        <div
                          style={{
                            padding: "12px",
                            backgroundColor: "rgba(156, 163, 175, 0.05)",
                            borderRadius: "8px",
                            fontSize: "14px",
                            color: "rgba(156, 163, 175, 0.6)",
                          }}
                        >
                          Waiting to start...
                        </div>
                      ) : null}

                      {/* Display active todos if this is the last in-progress turn */}
                      {turn.status === "in_progress" && activeTodos && (
                        <ActiveTodosDisplay todos={activeTodos} />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div
        style={{
          borderTop: "1px solid rgba(156, 163, 175, 0.1)",
          padding: "16px",
          backgroundColor: "var(--background)",
        }}
      >
        {/* Error Message */}
        {error && (
          <div
            style={{
              marginBottom: "12px",
              padding: "12px",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "6px",
              fontSize: "14px",
              color: "#dc2626",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>⚠️ {error}</span>
            <button
              onClick={() => setError(null)}
              style={{
                background: "none",
                border: "none",
                color: "#dc2626",
                cursor: "pointer",
                fontSize: "16px",
                padding: "0 4px",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.opacity = "0.7";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.opacity = "1";
              }}
            >
              ×
            </button>
          </div>
        )}
        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "flex-end",
          }}
        >
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Ask Claude to help with your code..."
            disabled={isSubmitting || !sessionId}
            style={{
              flex: 1,
              minHeight: "80px",
              maxHeight: "200px",
              padding: "12px",
              border: "2px solid rgba(156, 163, 175, 0.2)",
              borderRadius: "8px",
              fontSize: "14px",
              fontFamily: "inherit",
              backgroundColor: "var(--background)",
              color: "var(--foreground)",
              resize: "vertical",
              outline: "none",
              opacity: isSubmitting ? 0.5 : 1,
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "rgba(59, 130, 246, 0.5)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "rgba(156, 163, 175, 0.2)";
            }}
          />
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !message.trim() || !sessionId}
              style={{
                padding: "12px 24px",
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "500",
                cursor:
                  isSubmitting || !message.trim() || !sessionId
                    ? "not-allowed"
                    : "pointer",
                opacity:
                  isSubmitting || !message.trim() || !sessionId ? 0.5 : 1,
              }}
              onMouseOver={(e) => {
                if (!isSubmitting && message.trim() && sessionId) {
                  e.currentTarget.style.backgroundColor = "#2563eb";
                }
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "#3b82f6";
              }}
            >
              {isSubmitting ? "Sending..." : "Send"}
            </button>
          </div>
        </div>

        <div
          style={{
            marginTop: "8px",
            fontSize: "12px",
            color: "rgba(156, 163, 175, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>Press Enter to send, Shift+Enter for new line</span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {isPolling && (
              <span
                style={{
                  padding: "2px 6px",
                  backgroundColor: "rgba(59, 130, 246, 0.1)",
                  borderRadius: "3px",
                  fontSize: "11px",
                  color: "#3b82f6",
                }}
              >
                Syncing...
              </span>
            )}
            <span
              style={{
                padding: "2px 6px",
                backgroundColor: "rgba(34, 197, 94, 0.1)",
                borderRadius: "3px",
                fontSize: "11px",
                color: "#22c55e",
              }}
            >
              Mock Mode
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes dots {
          0%,
          20% {
            content: ".";
          }
          40% {
            content: "..";
          }
          60%,
          100% {
            content: "...";
          }
        }
        .loading-dots::after {
          content: "";
          animation: dots 1.5s infinite;
        }
      `}</style>
    </div>
  );
}
