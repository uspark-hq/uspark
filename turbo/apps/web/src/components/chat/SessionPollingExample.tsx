"use client";

import React from "react";
import { useSessionPolling } from "../../hooks/useSessionPolling";
import type { Session, Turn, Block } from "../../lib/api/sessions";

interface SessionPollingExampleProps {
  projectId: string;
  sessionId: string;
}

/**
 * Example component demonstrating the session polling hook
 * This can be used as a reference for integrating polling into the actual chat UI
 */
export function SessionPollingExample({
  projectId,
  sessionId,
}: SessionPollingExampleProps) {
  const { session, isPolling, error, startPolling, stopPolling, refetch } =
    useSessionPolling(projectId, sessionId, {
      runningInterval: 1000,
      idleInterval: 5000,
      enabled: true,
      onUpdate: (updatedSession: Session) => {
        console.log("Session updated:", updatedSession);
      },
      onError: (error: Error) => {
        console.error("Polling error:", error);
      },
    });

  const renderBlock = (block: Block) => {
    const blockStyles: Record<Block["type"], string> = {
      thinking: "bg-blue-50 border-blue-200",
      tool_use: "bg-green-50 border-green-200",
      content: "bg-gray-50 border-gray-200",
      error: "bg-red-50 border-red-200",
    };

    return (
      <div
        key={block.id}
        className={`p-2 mb-2 border rounded ${blockStyles[block.type]}`}
      >
        <div className="text-xs text-gray-500 mb-1">{block.type}</div>
        <div className="text-sm whitespace-pre-wrap">{block.content}</div>
      </div>
    );
  };

  const renderTurn = (turn: Turn) => {
    const statusColors: Record<Turn["status"], string> = {
      running: "text-blue-600",
      completed: "text-green-600",
      failed: "text-red-600",
    };

    return (
      <div key={turn.id} className="mb-4 p-4 border rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium">Turn {turn.id.slice(0, 8)}</div>
          <div className={`text-sm ${statusColors[turn.status]}`}>
            {turn.status}
          </div>
        </div>

        <div className="mb-3">
          <div className="text-sm text-gray-500 mb-1">User Message:</div>
          <div className="p-2 bg-gray-100 rounded">{turn.userMessage}</div>
        </div>

        {turn.blocks.length > 0 && (
          <div>
            <div className="text-sm text-gray-500 mb-1">Claude Response:</div>
            <div className="pl-2">{turn.blocks.map(renderBlock)}</div>
          </div>
        )}
      </div>
    );
  };

  const getStatusBadge = (status: Session["status"]) => {
    const statusStyles: Record<Session["status"], string> = {
      idle: "bg-gray-100 text-gray-700",
      running: "bg-blue-100 text-blue-700 animate-pulse",
      completed: "bg-green-100 text-green-700",
      failed: "bg-red-100 text-red-700",
      interrupted: "bg-yellow-100 text-yellow-700",
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[status]}`}
      >
        {status}
      </span>
    );
  };

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="font-medium text-red-800 mb-2">Polling Error</div>
        <div className="text-sm text-red-600">{error.message}</div>
        <button
          onClick={refetch}
          className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="text-gray-600">Loading session...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Session Header */}
      <div className="p-4 bg-white border rounded-lg shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Session Details</h2>
          <div className="flex items-center gap-2">
            {getStatusBadge(session.status)}
            {isPolling && (
              <span className="text-xs text-gray-500">Polling active</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
          <div>
            <span className="font-medium">Session ID:</span>{" "}
            {session.id.slice(0, 8)}
          </div>
          <div>
            <span className="font-medium">Project ID:</span>{" "}
            {session.projectId.slice(0, 8)}
          </div>
          <div>
            <span className="font-medium">Created:</span>{" "}
            {new Date(session.createdAt).toLocaleTimeString()}
          </div>
          <div>
            <span className="font-medium">Updated:</span>{" "}
            {new Date(session.updatedAt).toLocaleTimeString()}
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-2 mt-3">
          {!isPolling ? (
            <button
              onClick={startPolling}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              Start Polling
            </button>
          ) : (
            <button
              onClick={stopPolling}
              className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
            >
              Stop Polling
            </button>
          )}
          <button
            onClick={refetch}
            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
          >
            Refresh Now
          </button>
        </div>
      </div>

      {/* Turns Display */}
      <div className="p-4 bg-white border rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold mb-3">
          Conversation ({session.turns.length} turns)
        </h3>

        {session.turns.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            No conversation turns yet
          </div>
        ) : (
          <div className="space-y-2">{session.turns.map(renderTurn)}</div>
        )}
      </div>

      {/* Debug Info */}
      <details className="p-4 bg-gray-50 border rounded-lg">
        <summary className="cursor-pointer font-medium text-sm">
          Debug Information
        </summary>
        <pre className="mt-2 text-xs overflow-auto">
          {JSON.stringify(
            {
              isPolling,
              sessionStatus: session.status,
              turnsCount: session.turns.length,
              lastUpdate: session.updatedAt,
            },
            null,
            2,
          )}
        </pre>
      </details>
    </div>
  );
}
