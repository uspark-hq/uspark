import React from "react";
import type { Turn } from "./types";

interface ChatStatusProps {
  currentTurn?: Turn;
  sessionId?: string;
  onInterrupt?: () => void;
  elapsedSeconds?: number; // Elapsed time in seconds, provided by parent
}

export function ChatStatus({
  currentTurn,
  sessionId,
  onInterrupt,
  elapsedSeconds = 0,
}: ChatStatusProps) {
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const getStatusMessage = () => {
    if (!currentTurn) {
      return "Ready to chat";
    }

    switch (currentTurn.status) {
      case "pending":
        return "Preparing response...";
      case "running":
        return "Claude is thinking...";
      case "completed":
        return "Response complete";
      case "failed":
        return "Response failed";
      default:
        return "Unknown status";
    }
  };

  const getStatusIcon = () => {
    if (!currentTurn) {
      return "🟢";
    }

    switch (currentTurn.status) {
      case "pending":
        return "⏳";
      case "running":
        return "🔄";
      case "completed":
        return "✅";
      case "failed":
        return "❌";
      default:
        return "❓";
    }
  };

  const getStatusColor = () => {
    if (!currentTurn) {
      return "bg-green-100 text-green-800 border-green-200";
    }

    switch (currentTurn.status) {
      case "pending":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "running":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "failed":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg border ${getStatusColor()}`}
    >
      <div className="flex items-center gap-3">
        <span className="text-lg animate-pulse">{getStatusIcon()}</span>
        <div>
          <p className="text-sm font-medium">{getStatusMessage()}</p>
          {sessionId && (
            <p className="text-xs opacity-75">
              Session: {sessionId.slice(0, 8)}...
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {currentTurn?.status === "running" && (
          <>
            <div className="flex items-center gap-2">
              <div className="flex space-x-1">
                <div
                  className="w-2 h-2 bg-current rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                ></div>
                <div
                  className="w-2 h-2 bg-current rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                ></div>
                <div
                  className="w-2 h-2 bg-current rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                ></div>
              </div>
              <span className="text-sm font-mono">
                {formatTime(elapsedSeconds)}
              </span>
            </div>
            {onInterrupt && (
              <button
                onClick={onInterrupt}
                className="px-3 py-1 text-xs font-medium bg-white border border-current rounded hover:bg-gray-50 transition-colors"
              >
                Interrupt
              </button>
            )}
          </>
        )}

        {currentTurn?.status === "completed" &&
          currentTurn.started_at &&
          currentTurn.completed_at && (
            <span className="text-sm">
              Completed in{" "}
              {formatTime(
                Math.floor(
                  (new Date(currentTurn.completed_at).getTime() -
                    new Date(currentTurn.started_at).getTime()) /
                    1000,
                ),
              )}
            </span>
          )}

        {currentTurn?.status === "failed" && (
          <span className="text-sm font-medium">Error occurred</span>
        )}
      </div>
    </div>
  );
}
