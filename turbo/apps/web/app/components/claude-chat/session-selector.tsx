"use client";

import { useState, useEffect } from "react";

interface Session {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SessionSelectorProps {
  projectId: string;
  currentSessionId: string | null;
  onSessionChange: (sessionId: string) => void;
  onNewSession: () => void;
}

export function SessionSelector({
  projectId,
  currentSessionId,
  onSessionChange,
  onNewSession,
}: SessionSelectorProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch all sessions for the project
  useEffect(() => {
    const fetchSessions = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/projects/${projectId}/sessions`);
        if (response.ok) {
          const data = await response.json();
          setSessions(data.sessions || []);
        }
      } catch (error) {
        console.error("Failed to fetch sessions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [projectId, currentSessionId]); // Refetch when session changes

  const currentSession = sessions.find((s) => s.id === currentSessionId);

  const formatDate = (dateString: string) => {
    if (!dateString) {
      return "Unknown time";
    }

    const date = new Date(dateString);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "Unknown time";
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // Today - show time
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      // Show date for older sessions
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  return (
    <div style={{ position: "relative" }}>
      {/* Current Session Display */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 12px",
          backgroundColor: "rgba(156, 163, 175, 0.05)",
          border: "1px solid rgba(156, 163, 175, 0.2)",
          borderRadius: "6px",
          color: "var(--foreground)",
          fontSize: "14px",
          cursor: loading ? "wait" : "pointer",
          width: "100%",
          maxWidth: "300px",
          transition: "all 0.2s",
        }}
        onMouseOver={(e) => {
          if (!loading) {
            e.currentTarget.style.backgroundColor = "rgba(156, 163, 175, 0.1)";
          }
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(156, 163, 175, 0.05)";
        }}
      >
        <span style={{ fontSize: "16px" }}>💬</span>
        <div style={{ flex: 1, textAlign: "left" }}>
          {loading ? (
            <span style={{ color: "rgba(156, 163, 175, 0.6)" }}>
              Loading sessions...
            </span>
          ) : currentSession ? (
            <div>
              <div style={{ fontWeight: "500" }}>
                {currentSession.title || "Untitled Session"}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "rgba(156, 163, 175, 0.6)",
                  marginTop: "2px",
                }}
              >
                {formatDate(currentSession.createdAt)}
              </div>
            </div>
          ) : (
            <span style={{ color: "rgba(156, 163, 175, 0.6)" }}>
              No session selected
            </span>
          )}
        </div>
        <span
          style={{
            fontSize: "12px",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
            display: "inline-block",
          }}
        >
          ▼
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 40,
            }}
          />

          {/* Menu */}
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              marginTop: "4px",
              backgroundColor: "var(--background)",
              border: "1px solid rgba(156, 163, 175, 0.2)",
              borderRadius: "8px",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              maxHeight: "300px",
              overflowY: "auto",
              width: "300px",
              zIndex: 50,
            }}
          >
            {/* New Session Button */}
            <button
              onClick={() => {
                setIsOpen(false);
                onNewSession();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                width: "100%",
                padding: "10px 12px",
                backgroundColor: "transparent",
                border: "none",
                borderBottom: "1px solid rgba(156, 163, 175, 0.1)",
                color: "#3b82f6",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                textAlign: "left",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(59, 130, 246, 0.05)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <span style={{ fontSize: "16px" }}>➕</span>
              <span>New Session</span>
            </button>

            {/* Sessions List */}
            {sessions.length === 0 ? (
              <div
                style={{
                  padding: "16px",
                  textAlign: "center",
                  color: "rgba(156, 163, 175, 0.6)",
                  fontSize: "14px",
                }}
              >
                No sessions yet
              </div>
            ) : (
              sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => {
                    setIsOpen(false);
                    onSessionChange(session.id);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    width: "100%",
                    padding: "10px 12px",
                    backgroundColor:
                      session.id === currentSessionId
                        ? "rgba(59, 130, 246, 0.1)"
                        : "transparent",
                    border: "none",
                    color: "var(--foreground)",
                    fontSize: "14px",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background-color 0.2s",
                  }}
                  onMouseOver={(e) => {
                    if (session.id !== currentSessionId) {
                      e.currentTarget.style.backgroundColor =
                        "rgba(156, 163, 175, 0.05)";
                    }
                  }}
                  onMouseOut={(e) => {
                    if (session.id !== currentSessionId) {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }
                  }}
                >
                  <span
                    style={{
                      fontSize: "16px",
                      color:
                        session.id === currentSessionId
                          ? "#3b82f6"
                          : "rgba(156, 163, 175, 0.6)",
                    }}
                  >
                    💬
                  </span>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontWeight:
                          session.id === currentSessionId ? "500" : "400",
                      }}
                    >
                      {session.title || "Untitled Session"}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "rgba(156, 163, 175, 0.6)",
                        marginTop: "2px",
                      }}
                    >
                      {formatDate(session.createdAt)}
                    </div>
                  </div>
                  {session.id === currentSessionId && (
                    <div
                      style={{
                        width: "4px",
                        height: "4px",
                        borderRadius: "50%",
                        backgroundColor: "#3b82f6",
                      }}
                    />
                  )}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
