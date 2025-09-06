import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ChatStatus } from "../ChatStatus";
import type { Turn } from "../types";

describe("ChatStatus", () => {

  it("shows ready state when no current turn", () => {
    render(<ChatStatus />);
    expect(screen.getByText("Ready to chat")).toBeInTheDocument();
    expect(screen.getByText("🟢")).toBeInTheDocument();
  });

  it("shows pending state", () => {
    const turn: Turn = {
      id: "turn-1",
      session_id: "session-1",
      user_prompt: "Test",
      status: "pending",
      created_at: new Date().toISOString(),
      blocks: [],
      block_count: 0,
    };

    render(<ChatStatus currentTurn={turn} />);
    expect(screen.getByText("Preparing response...")).toBeInTheDocument();
    expect(screen.getByText("⏳")).toBeInTheDocument();
  });

  it("shows running state with elapsed time", () => {
    const turn: Turn = {
      id: "turn-1",
      session_id: "session-1",
      user_prompt: "Test",
      status: "running",
      started_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      blocks: [],
      block_count: 0,
    };

    render(<ChatStatus currentTurn={turn} elapsedSeconds={15} />);
    expect(screen.getByText("Claude is thinking...")).toBeInTheDocument();
    expect(screen.getByText("🔄")).toBeInTheDocument();
    
    // Check elapsed time display
    expect(screen.getByText("15s")).toBeInTheDocument();
  });

  it("shows completed state with duration", () => {
    const turn: Turn = {
      id: "turn-1",
      session_id: "session-1",
      user_prompt: "Test",
      status: "completed",
      started_at: new Date(Date.now() - 30000).toISOString(),
      completed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      blocks: [],
      block_count: 0,
    };

    render(<ChatStatus currentTurn={turn} />);
    expect(screen.getByText("Response complete")).toBeInTheDocument();
    expect(screen.getByText("✅")).toBeInTheDocument();
    expect(screen.getByText(/Completed in 30s/)).toBeInTheDocument();
  });

  it("shows failed state", () => {
    const turn: Turn = {
      id: "turn-1",
      session_id: "session-1",
      user_prompt: "Test",
      status: "failed",
      created_at: new Date().toISOString(),
      blocks: [],
      block_count: 0,
    };

    render(<ChatStatus currentTurn={turn} />);
    expect(screen.getByText("Response failed")).toBeInTheDocument();
    expect(screen.getByText("❌")).toBeInTheDocument();
    expect(screen.getByText("Error occurred")).toBeInTheDocument();
  });

  it("displays session ID when provided", () => {
    const { container } = render(<ChatStatus sessionId="session-abc123" />);
    // The session ID is displayed with ellipsis
    const sessionElement = container.querySelector('.text-xs.opacity-75');
    expect(sessionElement).toBeInTheDocument();
    expect(sessionElement?.textContent).toContain("Session:");
    expect(sessionElement?.textContent).toContain("...");
  });

  it("shows interrupt button for running turn", () => {
    const turn: Turn = {
      id: "turn-1",
      session_id: "session-1",
      user_prompt: "Test",
      status: "running",
      started_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      blocks: [],
      block_count: 0,
    };

    const handleInterrupt = vi.fn();
    render(<ChatStatus currentTurn={turn} onInterrupt={handleInterrupt} />);
    
    const interruptButton = screen.getByText("Interrupt");
    expect(interruptButton).toBeInTheDocument();
    
    fireEvent.click(interruptButton);
    expect(handleInterrupt).toHaveBeenCalled();
  });

  it("does not show interrupt button when no handler provided", () => {
    const turn: Turn = {
      id: "turn-1",
      session_id: "session-1",
      user_prompt: "Test",
      status: "running",
      started_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      blocks: [],
      block_count: 0,
    };

    render(<ChatStatus currentTurn={turn} />);
    expect(screen.queryByText("Interrupt")).not.toBeInTheDocument();
  });

  it("formats time correctly for minutes", () => {
    const turn: Turn = {
      id: "turn-1",
      session_id: "session-1",
      user_prompt: "Test",
      status: "running",
      started_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      blocks: [],
      block_count: 0,
    };

    render(<ChatStatus currentTurn={turn} elapsedSeconds={75} />);
    
    // Check that 75 seconds is formatted as 1m 15s
    expect(screen.getByText("1m 15s")).toBeInTheDocument();
  });

  it("applies correct styling for each status", () => {
    const { container, rerender } = render(<ChatStatus />);
    expect(container.querySelector(".bg-green-100")).toBeInTheDocument();

    const pendingTurn: Turn = {
      id: "turn-1",
      session_id: "session-1",
      user_prompt: "Test",
      status: "pending",
      created_at: new Date().toISOString(),
      blocks: [],
      block_count: 0,
    };
    
    rerender(<ChatStatus currentTurn={pendingTurn} />);
    expect(container.querySelector(".bg-gray-100")).toBeInTheDocument();

    const runningTurn = { ...pendingTurn, status: "running" as const, started_at: new Date().toISOString() };
    rerender(<ChatStatus currentTurn={runningTurn} />);
    expect(container.querySelector(".bg-blue-100")).toBeInTheDocument();

    const failedTurn = { ...pendingTurn, status: "failed" as const };
    rerender(<ChatStatus currentTurn={failedTurn} />);
    expect(container.querySelector(".bg-red-100")).toBeInTheDocument();
  });

  it("shows animated dots for running state", () => {
    const turn: Turn = {
      id: "turn-1",
      session_id: "session-1",
      user_prompt: "Test",
      status: "running",
      started_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      blocks: [],
      block_count: 0,
    };

    const { container } = render(<ChatStatus currentTurn={turn} />);
    const animatedDots = container.querySelectorAll(".animate-bounce");
    expect(animatedDots).toHaveLength(3);
  });
});