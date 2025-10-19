import { render } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { ActiveTodosDisplay } from "../active-todos-display";

describe("ActiveTodosDisplay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return null when todos array is empty", () => {
    const { container } = render(<ActiveTodosDisplay todos={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("should render todo items with different statuses", () => {
    const todos = [
      {
        content: "Completed task",
        status: "completed" as const,
        activeForm: "Completing task",
      },
      {
        content: "In progress task",
        status: "in_progress" as const,
        activeForm: "Working on task",
      },
      {
        content: "Pending task",
        status: "pending" as const,
        activeForm: "Will work on task",
      },
    ];

    const { container } = render(<ActiveTodosDisplay todos={todos} />);

    // Verify component renders without errors
    expect(container.firstChild).toBeTruthy();
  });
});
