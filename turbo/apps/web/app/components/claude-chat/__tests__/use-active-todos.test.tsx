import { renderHook } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useActiveTodos } from "../use-active-todos";

describe("useActiveTodos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("should return null when there are no turns", () => {
    const { result } = renderHook(() => useActiveTodos([]));
    expect(result.current).toBeNull();
  });

  it("should return null when there are no in-progress turns", () => {
    const turns = [
      {
        id: "turn_1",
        status: "completed" as const,
        blocks: [],
        userPrompt: "Test",
        startedAt: null,
        completedAt: null,
      },
      {
        id: "turn_2",
        status: "failed" as const,
        blocks: [],
        userPrompt: "Test",
        startedAt: null,
        completedAt: null,
      },
    ];

    const { result } = renderHook(() => useActiveTodos(turns));
    expect(result.current).toBeNull();
  });

  it("should return null when in-progress turn has no TodoWrite blocks", () => {
    const turns = [
      {
        id: "turn_1",
        status: "in_progress" as const,
        blocks: [
          {
            id: "block_1",
            type: "content",
            content: { text: "Hello" },
          },
        ],
        userPrompt: "Test",
        startedAt: null,
        completedAt: null,
      },
    ];

    const { result } = renderHook(() => useActiveTodos(turns));
    expect(result.current).toBeNull();
  });

  it("should return todos from the last TodoWrite block in the last in-progress turn", () => {
    const turns = [
      {
        id: "turn_1",
        status: "in_progress" as const,
        blocks: [
          {
            id: "block_1",
            type: "tool_use",
            content: {
              tool_name: "TodoWrite",
              parameters: {
                todos: [
                  {
                    content: "Task 1",
                    status: "completed",
                    activeForm: "Completing task 1",
                  },
                  {
                    content: "Task 2",
                    status: "in_progress",
                    activeForm: "Working on task 2",
                  },
                ],
              },
            },
          },
        ],
        userPrompt: "Test",
        startedAt: null,
        completedAt: null,
      },
    ];

    const { result } = renderHook(() => useActiveTodos(turns));
    expect(result.current).toEqual([
      {
        content: "Task 1",
        status: "completed",
        activeForm: "Completing task 1",
      },
      {
        content: "Task 2",
        status: "in_progress",
        activeForm: "Working on task 2",
      },
    ]);
  });

  it("should return todos from the last TodoWrite when there are multiple", () => {
    const turns = [
      {
        id: "turn_1",
        status: "in_progress" as const,
        blocks: [
          {
            id: "block_1",
            type: "tool_use",
            content: {
              tool_name: "TodoWrite",
              parameters: {
                todos: [
                  {
                    content: "Old task",
                    status: "pending",
                    activeForm: "Working on old task",
                  },
                ],
              },
            },
          },
          {
            id: "block_2",
            type: "content",
            content: { text: "Some content" },
          },
          {
            id: "block_3",
            type: "tool_use",
            content: {
              tool_name: "TodoWrite",
              parameters: {
                todos: [
                  {
                    content: "New task 1",
                    status: "completed",
                    activeForm: "Completing new task 1",
                  },
                  {
                    content: "New task 2",
                    status: "in_progress",
                    activeForm: "Working on new task 2",
                  },
                ],
              },
            },
          },
        ],
        userPrompt: "Test",
        startedAt: null,
        completedAt: null,
      },
    ];

    const { result } = renderHook(() => useActiveTodos(turns));
    expect(result.current).toEqual([
      {
        content: "New task 1",
        status: "completed",
        activeForm: "Completing new task 1",
      },
      {
        content: "New task 2",
        status: "in_progress",
        activeForm: "Working on new task 2",
      },
    ]);
  });

  it("should only consider the last in-progress turn when there are multiple", () => {
    const turns = [
      {
        id: "turn_1",
        status: "in_progress" as const,
        blocks: [
          {
            id: "block_1",
            type: "tool_use",
            content: {
              tool_name: "TodoWrite",
              parameters: {
                todos: [
                  {
                    content: "Old turn task",
                    status: "pending",
                    activeForm: "Working on old turn task",
                  },
                ],
              },
            },
          },
        ],
        userPrompt: "Test 1",
        startedAt: null,
        completedAt: null,
      },
      {
        id: "turn_2",
        status: "in_progress" as const,
        blocks: [
          {
            id: "block_2",
            type: "tool_use",
            content: {
              tool_name: "TodoWrite",
              parameters: {
                todos: [
                  {
                    content: "New turn task",
                    status: "in_progress",
                    activeForm: "Working on new turn task",
                  },
                ],
              },
            },
          },
        ],
        userPrompt: "Test 2",
        startedAt: null,
        completedAt: null,
      },
    ];

    const { result } = renderHook(() => useActiveTodos(turns));
    expect(result.current).toEqual([
      {
        content: "New turn task",
        status: "in_progress",
        activeForm: "Working on new turn task",
      },
    ]);
  });

  it("should return null when TodoWrite has empty todos array", () => {
    const turns = [
      {
        id: "turn_1",
        status: "in_progress" as const,
        blocks: [
          {
            id: "block_1",
            type: "tool_use",
            content: {
              tool_name: "TodoWrite",
              parameters: {
                todos: [],
              },
            },
          },
        ],
        userPrompt: "Test",
        startedAt: null,
        completedAt: null,
      },
    ];

    const { result } = renderHook(() => useActiveTodos(turns));
    expect(result.current).toBeNull();
  });
});
