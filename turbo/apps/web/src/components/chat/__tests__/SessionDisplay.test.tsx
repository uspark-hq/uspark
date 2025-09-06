import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SessionDisplay } from "../SessionDisplay";
import type { Turn } from "../types";

describe("SessionDisplay", () => {
  const mockTurns: Turn[] = [
    {
      id: "turn-1",
      session_id: "session-1",
      user_prompt: "Test prompt 1",
      status: "completed",
      created_at: new Date().toISOString(),
      blocks: [],
      block_count: 0,
    },
    {
      id: "turn-2",
      session_id: "session-1",
      user_prompt: "Test prompt 2",
      status: "running",
      created_at: new Date().toISOString(),
      blocks: [],
      block_count: 0,
    },
  ];

  it("renders empty state when no turns", () => {
    render(<SessionDisplay turns={[]} />);
    expect(screen.getByText(/No conversation yet/i)).toBeInTheDocument();
    expect(screen.getByText(/Send a message to start/i)).toBeInTheDocument();
  });

  it("renders turns when provided", () => {
    render(<SessionDisplay turns={mockTurns} />);
    expect(screen.getByText("Test prompt 1")).toBeInTheDocument();
    expect(screen.getByText("Test prompt 2")).toBeInTheDocument();
  });

  it("displays turn numbers correctly", () => {
    render(<SessionDisplay turns={mockTurns} />);
    expect(screen.getByText("Turn #1")).toBeInTheDocument();
    expect(screen.getByText("Turn #2")).toBeInTheDocument();
  });

  it("highlights active turn", () => {
    const { container } = render(
      <SessionDisplay turns={mockTurns} currentTurnId="turn-2" />
    );
    const activeTurn = container.querySelector(".border-blue-500");
    expect(activeTurn).toBeInTheDocument();
  });

  it("calls onTurnClick when turn is clicked", () => {
    const handleClick = vi.fn();
    render(
      <SessionDisplay turns={mockTurns} onTurnClick={handleClick} />
    );
    
    const firstTurn = screen.getByText("Test prompt 1").closest('[role="button"]');
    fireEvent.click(firstTurn!);
    
    expect(handleClick).toHaveBeenCalledWith("turn-1");
  });

  it("applies custom className", () => {
    const { container } = render(
      <SessionDisplay turns={mockTurns} className="custom-class" />
    );
    expect(container.querySelector(".custom-class")).toBeInTheDocument();
  });
});