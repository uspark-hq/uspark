import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TurnDisplay } from "../TurnDisplay";
import type { Turn } from "../types";

describe("TurnDisplay", () => {
  const mockTurn: Turn = {
    id: "turn-1",
    session_id: "session-1",
    user_prompt: "Test user prompt",
    status: "completed",
    started_at: new Date(Date.now() - 30000).toISOString(),
    completed_at: new Date().toISOString(),
    created_at: new Date(Date.now() - 30000).toISOString(),
    blocks: [
      {
        id: "block-1",
        turn_id: "turn-1",
        type: "content",
        content: { text: "Test response" },
        sequence_number: 0,
      },
    ],
    block_count: 1,
  };

  it("renders turn number and user prompt", () => {
    render(<TurnDisplay turn={mockTurn} turnNumber={1} />);
    expect(screen.getByText("Turn #1")).toBeInTheDocument();
    expect(screen.getByText("Test user prompt")).toBeInTheDocument();
  });

  it("displays correct status icon for each status", () => {
    const statuses: Array<Turn["status"]> = ["pending", "running", "completed", "failed"];
    const expectedIcons = ["⏳", "🔄", "✅", "❌"];

    statuses.forEach((status, index) => {
      const turn = { ...mockTurn, status };
      const { container } = render(<TurnDisplay turn={turn} turnNumber={1} />);
      expect(container.textContent).toContain(expectedIcons[index]);
    });
  });

  it("shows duration for completed turns", () => {
    render(<TurnDisplay turn={mockTurn} turnNumber={1} />);
    expect(screen.getByText(/30s/)).toBeInTheDocument();
  });

  it("shows processing indicator for running turns", () => {
    const runningTurn = { ...mockTurn, status: "running" as const };
    render(<TurnDisplay turn={runningTurn} turnNumber={1} />);
    expect(screen.getByText("Processing...")).toBeInTheDocument();
  });

  it("toggles expand/collapse state", () => {
    const { container } = render(<TurnDisplay turn={mockTurn} turnNumber={1} />);
    
    const expandButton = container.querySelector('[aria-label="Collapse"]');
    expect(expandButton).toBeInTheDocument();
    expect(screen.getByText("Test response")).toBeInTheDocument();
    
    fireEvent.click(expandButton!);
    
    const collapseButton = container.querySelector('[aria-label="Expand"]');
    expect(collapseButton).toBeInTheDocument();
    expect(screen.queryByText("Test response")).not.toBeInTheDocument();
  });

  it("highlights when active", () => {
    const { container } = render(
      <TurnDisplay turn={mockTurn} turnNumber={1} isActive={true} />
    );
    expect(container.querySelector(".border-blue-500")).toBeInTheDocument();
  });

  it("calls onClick handler", () => {
    const handleClick = vi.fn();
    render(<TurnDisplay turn={mockTurn} turnNumber={1} onClick={handleClick} />);
    
    // Click on the main turn container, not the expand button
    const turnElement = screen.getByText("Test user prompt").closest('[role="button"]');
    fireEvent.click(turnElement!);
    
    expect(handleClick).toHaveBeenCalled();
  });

  it("handles keyboard interaction", () => {
    const handleClick = vi.fn();
    render(<TurnDisplay turn={mockTurn} turnNumber={1} onClick={handleClick} />);
    
    // Target the main turn container, not the expand button
    const turnElement = screen.getByText("Test user prompt").closest('[role="button"]');
    fireEvent.keyDown(turnElement!, { key: "Enter" });
    expect(handleClick).toHaveBeenCalledTimes(1);
    
    fireEvent.keyDown(turnElement!, { key: " " });
    expect(handleClick).toHaveBeenCalledTimes(2);
  });

  it("shows block count when blocks exist", () => {
    render(<TurnDisplay turn={mockTurn} turnNumber={1} />);
    expect(screen.getByText("(1 blocks)")).toBeInTheDocument();
  });

  it("shows empty message for completed turn with no blocks", () => {
    const emptyTurn = { ...mockTurn, blocks: [], block_count: 0 };
    render(<TurnDisplay turn={emptyTurn} turnNumber={1} />);
    expect(screen.getByText("No response blocks available")).toBeInTheDocument();
  });
});