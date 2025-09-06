import React, { useState } from "react";
import type { Turn } from "./types";
import { BlockDisplay } from "./BlockDisplay";

interface TurnDisplayProps {
  turn: Turn;
  turnNumber: number;
  isActive?: boolean;
  onClick?: () => void;
  durationText?: string; // Pre-calculated duration text from parent
}

export function TurnDisplay({
  turn,
  turnNumber,
  isActive = false,
  onClick,
  durationText,
}: TurnDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const getStatusIcon = () => {
    switch (turn.status) {
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
    switch (turn.status) {
      case "pending":
        return "text-gray-500";
      case "running":
        return "text-blue-500";
      case "completed":
        return "text-green-500";
      case "failed":
        return "text-red-500";
      default:
        return "text-gray-400";
    }
  };

  return (
    <div
      className={`border rounded-lg p-4 transition-all ${
        isActive
          ? "border-blue-500 bg-blue-50"
          : "border-gray-200 hover:border-gray-300"
      }`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onClick?.();
        }
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-gray-600">
            Turn #{turnNumber}
          </span>
          <span className={`text-lg ${getStatusColor()}`}>
            {getStatusIcon()}
          </span>
          {turn.status === "running" && (
            <span className="text-xs text-blue-500 animate-pulse">
              Processing...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {durationText && (
            <span className="text-xs text-gray-500">{durationText}</span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? "▼" : "▶"}
          </button>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex items-start gap-2">
          <span className="text-blue-600 text-sm mt-0.5">👤</span>
          <div className="flex-1">
            <p className="text-sm text-gray-800 line-clamp-2">
              {turn.user_prompt}
            </p>
          </div>
        </div>
      </div>

      {isExpanded && turn.blocks && turn.blocks.length > 0 && (
        <div className="mt-3 space-y-2 border-t pt-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-gray-600">
              Claude&apos;s Response
            </span>
            {turn.block_count && (
              <span className="text-xs text-gray-400">
                ({turn.block_count} blocks)
              </span>
            )}
          </div>
          <div className="space-y-2">
            {turn.blocks.map((block) => (
              <BlockDisplay key={block.id} block={block} />
            ))}
          </div>
        </div>
      )}

      {isExpanded &&
        (!turn.blocks || turn.blocks.length === 0) &&
        turn.status === "completed" && (
          <div className="mt-3 text-sm text-gray-500 italic">
            No response blocks available
          </div>
        )}
    </div>
  );
}
