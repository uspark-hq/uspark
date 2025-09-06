"use client";

import { useState } from "react";
import { SessionDisplay } from "../components/chat/SessionDisplay";
import { ChatStatus } from "../components/chat/ChatStatus";

// Mock data for testing
const mockSession = {
  id: "session-123456789",
  projectId: "project-abc",
  status: "running" as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  turns: [
    {
      id: "turn-1",
      sessionId: "session-123456789",
      userInput: "Can you help me add error handling to the login function?",
      status: "completed" as const,
      createdAt: new Date(Date.now() - 120000).toISOString(),
      updatedAt: new Date(Date.now() - 60000).toISOString(),
      blocks: [
        {
          id: "block-1-1",
          turnId: "turn-1",
          type: "thinking" as const,
          content: "I need to analyze the login function and identify potential error scenarios:\n- Network errors\n- Invalid credentials\n- Server errors\n- Timeout issues",
          createdAt: new Date(Date.now() - 110000).toISOString(),
        },
        {
          id: "block-1-2",
          turnId: "turn-1",
          type: "tool_use" as const,
          content: "Searching for login function in the codebase...\nPattern: 'function.*login|const.*login.*=|login.*async'",
          metadata: { tool_name: "Grep" },
          createdAt: new Date(Date.now() - 100000).toISOString(),
        },
        {
          id: "block-1-3",
          turnId: "turn-1",
          type: "text" as const,
          content: "I've found the login function and added comprehensive error handling. The updated code now includes:\n\n1. Try-catch blocks for async operations\n2. Specific error messages for different failure scenarios\n3. User-friendly error display\n4. Proper cleanup in finally blocks",
          createdAt: new Date(Date.now() - 70000).toISOString(),
        },
      ],
    },
    {
      id: "turn-2",
      sessionId: "session-123456789",
      userInput: "Great! Now can you add input validation before the API call?",
      status: "running" as const,
      createdAt: new Date(Date.now() - 30000).toISOString(),
      updatedAt: new Date().toISOString(),
      blocks: [
        {
          id: "block-2-1",
          turnId: "turn-2",
          type: "thinking" as const,
          content: "I should add client-side validation for:\n- Email format validation\n- Password minimum length\n- Required field checks",
          createdAt: new Date(Date.now() - 25000).toISOString(),
        },
        {
          id: "block-2-2",
          turnId: "turn-2",
          type: "tool_use" as const,
          content: "Reading the current login implementation...\nFile: /src/auth/login.ts",
          metadata: { tool_name: "Read" },
          createdAt: new Date(Date.now() - 20000).toISOString(),
        },
      ],
    },
  ],
};

const mockCompletedSession = {
  ...mockSession,
  id: "session-completed",
  status: "completed" as const,
  turns: [
    ...mockSession.turns.map(turn => ({
      ...turn,
      status: "completed" as const,
    })),
  ],
};

const mockFailedSession = {
  id: "session-failed",
  projectId: "project-abc",
  status: "failed" as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  turns: [
    {
      id: "turn-failed",
      sessionId: "session-failed",
      userInput: "Please update the configuration file",
      status: "failed" as const,
      createdAt: new Date(Date.now() - 60000).toISOString(),
      updatedAt: new Date(Date.now() - 30000).toISOString(),
      blocks: [
        {
          id: "block-error",
          turnId: "turn-failed",
          type: "error" as const,
          content: "Failed to access configuration file: Permission denied\nEnsure the file exists and has proper read/write permissions.",
          createdAt: new Date(Date.now() - 35000).toISOString(),
        },
      ],
    },
  ],
};

export default function TestChatPage() {
  const [selectedDemo, setSelectedDemo] = useState<"running" | "completed" | "failed" | "empty">("running");
  
  const getSession = () => {
    switch (selectedDemo) {
      case "running":
        return mockSession;
      case "completed":
        return mockCompletedSession;
      case "failed":
        return mockFailedSession;
      case "empty":
        return null;
    }
  };

  const session = getSession();
  const currentTurn = session?.turns[session.turns.length - 1];

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "system-ui, -apple-system, sans-serif",
        backgroundColor: "var(--background)",
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid rgba(156, 163, 175, 0.2)",
          backgroundColor: "var(--background)",
        }}
      >
        <h1
          style={{
            fontSize: "20px",
            fontWeight: "600",
            margin: "0 0 8px 0",
            color: "var(--foreground)",
          }}
        >
          Chat UI Components Test
        </h1>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => setSelectedDemo("running")}
            style={{
              padding: "6px 12px",
              fontSize: "13px",
              backgroundColor: selectedDemo === "running" ? "#3b82f6" : "transparent",
              color: selectedDemo === "running" ? "white" : "var(--foreground)",
              border: "1px solid rgba(156, 163, 175, 0.2)",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Running Session
          </button>
          <button
            onClick={() => setSelectedDemo("completed")}
            style={{
              padding: "6px 12px",
              fontSize: "13px",
              backgroundColor: selectedDemo === "completed" ? "#10b981" : "transparent",
              color: selectedDemo === "completed" ? "white" : "var(--foreground)",
              border: "1px solid rgba(156, 163, 175, 0.2)",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Completed Session
          </button>
          <button
            onClick={() => setSelectedDemo("failed")}
            style={{
              padding: "6px 12px",
              fontSize: "13px",
              backgroundColor: selectedDemo === "failed" ? "#ef4444" : "transparent",
              color: selectedDemo === "failed" ? "white" : "var(--foreground)",
              border: "1px solid rgba(156, 163, 175, 0.2)",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Failed Session
          </button>
          <button
            onClick={() => setSelectedDemo("empty")}
            style={{
              padding: "6px 12px",
              fontSize: "13px",
              backgroundColor: selectedDemo === "empty" ? "#6b7280" : "transparent",
              color: selectedDemo === "empty" ? "white" : "var(--foreground)",
              border: "1px solid rgba(156, 163, 175, 0.2)",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Empty Session
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Session Display */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          <SessionDisplay
            session={session}
            onInterrupt={() => {
              console.log("Interrupt clicked!");
              alert("Interrupt session requested");
            }}
          />
        </div>

        {/* Status Bar */}
        <div
          style={{
            padding: "16px",
            borderTop: "1px solid rgba(156, 163, 175, 0.1)",
            backgroundColor: "var(--background)",
          }}
        >
          <ChatStatus session={session} currentTurn={currentTurn} />
        </div>
      </div>
    </div>
  );
}