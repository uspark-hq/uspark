import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { InitialScanProgress } from "../initial-scan-progress";

describe("InitialScanProgress", () => {
  it("should show initializing message when no progress", () => {
    render(<InitialScanProgress progress={null} projectName="Test Project" />);

    expect(
      screen.getByText("Initializing scan for Test Project..."),
    ).toBeInTheDocument();
  });

  it("should only show in_progress tasks", () => {
    const progress = {
      todos: [
        {
          content: "Clone repository",
          status: "completed" as const,
          activeForm: "Cloning repository",
        },
        {
          content: "Analyze code structure",
          status: "in_progress" as const,
          activeForm: "Analyzing code structure",
        },
        {
          content: "Generate report",
          status: "pending" as const,
          activeForm: "Generating report",
        },
      ],
    };

    render(
      <InitialScanProgress progress={progress} projectName="Test Project" />,
    );

    // Should only show the in_progress task
    expect(screen.getByText("Analyzing code structure")).toBeInTheDocument();

    // Should NOT show completed tasks
    expect(screen.queryByText("Clone repository")).not.toBeInTheDocument();
    expect(screen.queryByText("Cloning repository")).not.toBeInTheDocument();

    // Should NOT show pending tasks
    expect(screen.queryByText("Generate report")).not.toBeInTheDocument();
  });

  it("should show generic message when no in_progress tasks", () => {
    const progress = {
      todos: [
        {
          content: "Clone repository",
          status: "completed" as const,
          activeForm: "Cloning repository",
        },
        {
          content: "Generate report",
          status: "pending" as const,
          activeForm: "Generating report",
        },
      ],
    };

    render(
      <InitialScanProgress progress={progress} projectName="Test Project" />,
    );

    // Should show generic scanning message
    expect(screen.getByText("Scanning Test Project...")).toBeInTheDocument();

    // Should NOT show any task details
    expect(screen.queryByText("Clone repository")).not.toBeInTheDocument();
    expect(screen.queryByText("Generate report")).not.toBeInTheDocument();
  });

  it("should show last block content when no todos available", () => {
    const progress = {
      lastBlock: {
        type: "content",
        content: {
          text: "Initializing repository scan...",
        },
      },
    };

    render(
      <InitialScanProgress progress={progress} projectName="Test Project" />,
    );

    expect(
      screen.getByText("Initializing repository scan..."),
    ).toBeInTheDocument();
  });

  it("should show multiple in_progress tasks", () => {
    const progress = {
      todos: [
        {
          content: "Analyze code structure",
          status: "in_progress" as const,
          activeForm: "Analyzing code structure",
        },
        {
          content: "Scan dependencies",
          status: "in_progress" as const,
          activeForm: "Scanning dependencies",
        },
      ],
    };

    render(
      <InitialScanProgress progress={progress} projectName="Test Project" />,
    );

    // Should show both in_progress tasks
    expect(screen.getByText("Analyzing code structure")).toBeInTheDocument();
    expect(screen.getByText("Scanning dependencies")).toBeInTheDocument();
  });
});
