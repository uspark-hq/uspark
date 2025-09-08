"use client";

import { useState, useEffect } from "react";
import { useSession } from "../../hooks/useSession";
import { SessionDisplay } from "./SessionDisplay";
import { ChatStatus } from "./ChatStatus";

interface ChatWithAPIProps {
  projectId: string;
  sessionId?: string;
  onSessionCreated?: (sessionId: string) => void;
}

/**
 * Chat component that uses real API calls (works with MSW mocking)
 * This demonstrates how the chat interface works with actual backend APIs
 */
export function ChatWithAPI({
  projectId,
  sessionId: initialSessionId,
  onSessionCreated,
}: ChatWithAPIProps) {
  const [activeSessionId, setActiveSessionId] = useState(initialSessionId);
  const [inputValue, setInputValue] = useState("");

  const {
    session,
    turns,
    isLoading,
    error,
    isSending,
    currentTurn,
    hasActiveTurns,
    createSession,
    sendMessage,
    interruptSession,
  } = useSession(projectId, activeSessionId || "");

  // Create a session if none exists
  useEffect(() => {
    if (!activeSessionId && !isLoading) {
      createSession("New Chat Session")
        .then((newSession) => {
          setActiveSessionId(newSession.id);
          if (onSessionCreated) {
            onSessionCreated(newSession.id);
          }
        })
        .catch(console.error);
    }
  }, [activeSessionId, isLoading, createSession, onSessionCreated]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isSending || !activeSessionId) return;

    const message = inputValue;
    setInputValue("");

    try {
      await sendMessage(message);
    } catch (err) {
      console.error("Failed to send message:", err);
      setInputValue(message); // Restore input on error
    }
  };

  const handleInterrupt = async () => {
    if (!hasActiveTurns) return;

    try {
      await interruptSession();
    } catch (err) {
      console.error("Failed to interrupt:", err);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading session...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Error: {error.message}</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">No session available</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{session.title}</h2>
            <div className="text-sm text-gray-500">
              Session ID: {session.id}
            </div>
          </div>
          <ChatStatus
            currentTurn={currentTurn}
            onInterrupt={hasActiveTurns ? handleInterrupt : undefined}
          />
        </div>
      </div>

      {/* Chat Display */}
      <div className="flex-1 overflow-auto">
        <SessionDisplay
          session={{
            ...session,
            createdAt:
              typeof session.createdAt === "string"
                ? session.createdAt
                : session.createdAt instanceof Date
                  ? session.createdAt.toISOString()
                  : new Date().toISOString(),
            updatedAt:
              typeof session.updatedAt === "string"
                ? session.updatedAt
                : session.updatedAt instanceof Date
                  ? session.updatedAt.toISOString()
                  : new Date().toISOString(),
          }}
          turns={turns}
        />
      </div>

      {/* Input Area */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isSending ? "Sending..." : "Type your message..."}
            disabled={isSending}
            className="flex-1 min-h-[60px] max-h-[200px] p-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            rows={2}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isSending}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSending ? "Sending..." : "Send"}
          </button>
        </div>
        {hasActiveTurns && (
          <div className="mt-2 text-sm text-gray-500">
            AI is generating a response...
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Demo page component that can be used for testing
 */
export function ChatAPIDemo() {
  const [sessionId, setSessionId] = useState<string>();
  const projectId = "project-test-1"; // Mock project ID for demo

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-gray-100 p-4 border-b">
        <h1 className="text-2xl font-bold">Chat API Demo (with MSW)</h1>
        <p className="text-sm text-gray-600 mt-1">
          This demo uses real API calls mocked by MSW for realistic behavior
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <ChatWithAPI
          projectId={projectId}
          sessionId={sessionId}
          onSessionCreated={setSessionId}
        />
      </div>
    </div>
  );
}
