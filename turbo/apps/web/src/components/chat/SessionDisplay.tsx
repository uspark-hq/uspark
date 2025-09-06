import React from "react";
import type { Turn } from "./types";
import { TurnDisplay } from "./TurnDisplay";

interface SessionDisplayProps {
  turns: Turn[];
  currentTurnId?: string;
  onTurnClick?: (turnId: string) => void;
  className?: string;
}

export function SessionDisplay({
  turns,
  currentTurnId,
  onTurnClick,
  className = "",
}: SessionDisplayProps) {
  if (turns.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center py-8 text-gray-500 ${className}`}
      >
        <div className="text-4xl mb-4">💬</div>
        <p className="text-sm">No conversation yet. Send a message to start!</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col space-y-4 p-4 ${className}`}>
      {turns.map((turn, index) => (
        <TurnDisplay
          key={turn.id}
          turn={turn}
          turnNumber={index + 1}
          isActive={turn.id === currentTurnId}
          onClick={() => onTurnClick?.(turn.id)}
        />
      ))}
    </div>
  );
}
