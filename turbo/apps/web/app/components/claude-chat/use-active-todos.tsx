"use client";

import { useMemo } from "react";

interface Block {
  id: string;
  type: string;
  content: Record<string, unknown>;
}

interface Turn {
  id: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  blocks: Block[];
}

interface TodoItem {
  content: string;
  status: "pending" | "in_progress" | "completed";
  activeForm: string;
}

/**
 * Extract the last TodoWrite block from the last in-progress turn.
 * Returns null if:
 * - No turns are in progress
 * - The last in-progress turn has no TodoWrite blocks
 * - The last in-progress turn is completed or failed
 */
export function useActiveTodos(turns: Turn[]): TodoItem[] | null {
  return useMemo(() => {
    // Find the last turn that is in progress
    const inProgressTurns = turns.filter(
      (turn) => turn.status === "in_progress",
    );

    if (inProgressTurns.length === 0) {
      return null;
    }

    // Get the last in-progress turn (most recent)
    const lastInProgressTurn = inProgressTurns[inProgressTurns.length - 1];

    if (!lastInProgressTurn) {
      return null;
    }

    // Find all TodoWrite blocks in this turn
    const todoWriteBlocks = lastInProgressTurn.blocks.filter(
      (block) =>
        block.type === "tool_use" && block.content?.tool_name === "TodoWrite",
    );

    if (todoWriteBlocks.length === 0) {
      return null;
    }

    // Get the last TodoWrite block
    const lastTodoWriteBlock = todoWriteBlocks[todoWriteBlocks.length - 1];

    if (!lastTodoWriteBlock) {
      return null;
    }

    // Extract todos from the block's parameters
    const parameters = lastTodoWriteBlock.content?.parameters as
      | {
          todos?: TodoItem[];
        }
      | undefined;

    const todos = parameters?.todos;

    if (!todos || !Array.isArray(todos) || todos.length === 0) {
      return null;
    }

    return todos;
  }, [turns]);
}
