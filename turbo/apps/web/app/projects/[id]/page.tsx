"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { YjsFileExplorer } from "../../components/file-explorer";
import { SessionDisplay } from "../../components/chat/SessionDisplay";
import { ChatStatus } from "../../components/chat/ChatStatus";
import { useSessionPolling } from "../../../src/hooks/useSessionPolling";
import { sessionsAPI } from "../../../src/lib/api/sessions";

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [selectedFile, setSelectedFile] = useState<string>();
  const [currentSessionId, setCurrentSessionId] = useState<string>();
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Use session polling hook
  const {
    session,
    error: sessionError,
    interruptSession,
  } = useSessionPolling({
    projectId,
    sessionId: currentSessionId,
    enabled: !!currentSessionId,
  });

  // Handle sending a message
  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim() || isSending) return;

    setIsSending(true);
    setInputMessage("");

    try {
      // Create a new session if needed
      let sessionId = currentSessionId;
      if (!sessionId) {
        const newSession = await sessionsAPI.createSession(projectId);
        sessionId = newSession.id;
        setCurrentSessionId(sessionId);
      }

      // Create a new turn with the user input
      await sessionsAPI.createTurn(projectId, sessionId, {
        user_prompt: inputMessage.trim(),
      });

      // Note: Real Claude integration would happen here
      // The backend would process the turn and add blocks
    } catch (error) {
      console.error("Failed to send message:", error);
      // Restore the input message on error
      setInputMessage(inputMessage);
    } finally {
      setIsSending(false);
    }
  }, [inputMessage, isSending, currentSessionId, projectId]);


  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid rgba(156, 163, 175, 0.2)",
          backgroundColor: "var(--background)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "20px",
              fontWeight: "600",
              margin: 0,
              color: "var(--foreground)",
            }}
          >
            Project: {projectId}
          </h1>
          <p
            style={{
              fontSize: "14px",
              color: "rgba(156, 163, 175, 0.8)",
              margin: "4px 0 0 0",
            }}
          >
            Browse files and collaborate with Claude Code
          </p>
        </div>

        <nav style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={() => window.history.back()}
            style={{
              padding: "8px 16px",
              fontSize: "14px",
              color: "rgba(156, 163, 175, 0.8)",
              textDecoration: "none",
              border: "1px solid rgba(156, 163, 175, 0.2)",
              borderRadius: "4px",
              backgroundColor: "transparent",
              cursor: "pointer",
            }}
          >
            ← Back to Projects
          </button>
        </nav>
      </header>

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "300px 1fr",
          gridTemplateRows: "1fr auto",
          gap: "1px",
          backgroundColor: "rgba(156, 163, 175, 0.1)",
          overflow: "hidden",
        }}
      >
        {/* File Explorer */}
        <div
          style={{
            backgroundColor: "var(--background)",
            overflow: "auto",
            gridRow: "span 2",
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid rgba(156, 163, 175, 0.1)",
              fontSize: "14px",
              fontWeight: "500",
              color: "var(--foreground)",
            }}
          >
            📁 Project Files
          </div>
          <YjsFileExplorer
            projectId={projectId}
            onFileSelect={setSelectedFile}
            selectedFile={selectedFile}
            showMetadata={true}
          />
        </div>

        {/* Session Display / Chat History */}
        <div
          style={{
            backgroundColor: "var(--background)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <SessionDisplay
            session={session}
            onInterrupt={interruptSession}
          />
        </div>

        {/* Chat Input */}
        <div
          style={{
            backgroundColor: "var(--background)",
            borderTop: "1px solid rgba(156, 163, 175, 0.1)",
            padding: "16px",
          }}
        >
          {/* Status Bar */}
          <div style={{ marginBottom: "12px" }}>
            <ChatStatus
              session={session}
              currentTurn={session?.turns?.[session.turns.length - 1]}
            />
          </div>

          {/* Input Area */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              alignItems: "center",
            }}
          >
            <div
              style={{
                flex: 1,
                position: "relative",
              }}
            >
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask Claude Code to modify your project files..."
                disabled={isSending || session?.turns?.some(t => t.status === "running" || t.status === "pending")}
                style={{
                  width: "100%",
                  minHeight: "80px",
                  padding: "12px",
                  border: "2px solid rgba(156, 163, 175, 0.2)",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontFamily: "inherit",
                  backgroundColor: "var(--background)",
                  color: "var(--foreground)",
                  resize: "vertical",
                  outline: "none",
                  opacity: isSending || session?.turns?.some(t => t.status === "running" || t.status === "pending") ? 0.6 : 1,
                  cursor: isSending || session?.turns?.some(t => t.status === "running" || t.status === "pending") ? "not-allowed" : "text",
                }}
                onFocus={(e) => {
                  if (!isSending && !session?.turns?.some(t => t.status === "running" || t.status === "pending")) {
                    e.target.style.borderColor = "rgba(59, 130, 246, 0.5)";
                  }
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(156, 163, 175, 0.2)";
                }}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={isSending || !inputMessage.trim() || session?.turns?.some(t => t.status === "running" || t.status === "pending")}
              style={{
                padding: "12px 24px",
                backgroundColor: isSending || !inputMessage.trim() || session?.turns?.some(t => t.status === "running" || t.status === "pending") 
                  ? "#94a3b8" 
                  : "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: isSending || !inputMessage.trim() || session?.turns?.some(t => t.status === "running" || t.status === "pending") 
                  ? "not-allowed" 
                  : "pointer",
                alignSelf: "flex-end",
                transition: "background-color 0.2s",
              }}
              onMouseOver={(e) => {
                if (!isSending && inputMessage.trim() && !session?.turns?.some(t => t.status === "running" || t.status === "pending")) {
                  e.currentTarget.style.backgroundColor = "#2563eb";
                }
              }}
              onMouseOut={(e) => {
                if (!isSending && inputMessage.trim() && !session?.turns?.some(t => t.status === "running" || t.status === "pending")) {
                  e.currentTarget.style.backgroundColor = "#3b82f6";
                }
              }}
            >
              {isSending ? "Sending..." : "Send"}
            </button>
          </div>

          <div
            style={{
              marginTop: "8px",
              fontSize: "12px",
              color: "rgba(156, 163, 175, 0.6)",
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <span>
              💡 Try: &quot;Add error handling to the login function&quot; or
              &quot;Create a new React component&quot;
            </span>
            {sessionError && (
              <div
                style={{
                  padding: "2px 6px",
                  backgroundColor: "rgba(239, 68, 68, 0.1)",
                  color: "#ef4444",
                  borderRadius: "3px",
                  fontSize: "11px",
                }}
              >
                Error: {sessionError.message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
