import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BlockDisplay } from "../block-display";

describe("BlockDisplay", () => {
  it("renders thinking block correctly", () => {
    const block = {
      id: "block-1",
      type: "thinking",
      content: { text: "Analyzing the request..." },
    };

    render(<BlockDisplay block={block} />);
    expect(screen.getByText(/Analyzing the request/)).toBeInTheDocument();
  });

  it("renders content block correctly", () => {
    const block = {
      id: "block-2",
      type: "content",
      content: { text: "Here is my response" },
    };

    render(<BlockDisplay block={block} />);
    expect(screen.getByText("Here is my response")).toBeInTheDocument();
  });

  it("renders tool_use block with parameters always visible", () => {
    const block = {
      id: "block-3",
      type: "tool_use",
      content: {
        tool_name: "read_file",
        parameters: { path: "/test.txt" },
        tool_use_id: "tool-123",
      },
    };

    render(<BlockDisplay block={block} />);
    expect(screen.getByText(/Tool: read_file/)).toBeInTheDocument();

    // Parameters should always be visible
    expect(screen.getByText(/\/test\.txt/)).toBeInTheDocument();
  });

  it("renders tool_result block with error state", () => {
    const block = {
      id: "block-4",
      type: "tool_result",
      content: {
        tool_use_id: "tool-123",
        error: "File not found",
        result: null,
      },
    };

    render(<BlockDisplay block={block} />);
    expect(screen.getByText(/Error: File not found/)).toBeInTheDocument();
  });

  it("renders tool_result block with success state", () => {
    const block = {
      id: "block-5",
      type: "tool_result",
      content: {
        tool_use_id: "tool-123",
        result: "File content here",
        error: null,
      },
    };

    render(<BlockDisplay block={block} />);
    expect(screen.getByText("File content here")).toBeInTheDocument();
  });

  it("displays all tool_result content without collapsing", () => {
    const multiLineContent = "Line 1\nLine 2\nLine 3\nLine 4\nLine 5";
    const block = {
      id: "block-6",
      type: "tool_result",
      content: {
        tool_use_id: "tool-123",
        result: multiLineContent,
        error: null,
      },
    };

    render(<BlockDisplay block={block} />);

    // Should show all lines (no collapsing)
    expect(screen.getByText(/Line 1/)).toBeInTheDocument();
    expect(screen.getByText(/Line 2/)).toBeInTheDocument();
    expect(screen.getByText(/Line 3/)).toBeInTheDocument();
    expect(screen.getByText(/Line 4/)).toBeInTheDocument();
    expect(screen.getByText(/Line 5/)).toBeInTheDocument();

    // Should not show expand/collapse arrows
    expect(screen.queryByText("▶")).not.toBeInTheDocument();
    expect(screen.queryByText("▼")).not.toBeInTheDocument();
  });
});
