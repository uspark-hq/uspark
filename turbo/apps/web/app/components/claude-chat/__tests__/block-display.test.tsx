import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

  it("renders tool_use block with collapsible parameters", () => {
    const block = {
      id: "block-3",
      type: "tool_use",
      content: {
        tool_name: "read_file",
        parameters: { path: "/test.txt" },
        tool_use_id: "tool-123",
      },
    };

    const { container } = render(<BlockDisplay block={block} />);
    expect(screen.getByText(/Tool: read_file/)).toBeInTheDocument();

    // Should show parameters by default
    expect(screen.getByText(/\/test\.txt/)).toBeInTheDocument();

    // Click to collapse - find the clickable header div
    const clickableHeader = container.querySelector(
      '[style*="cursor: pointer"]',
    );
    if (clickableHeader) {
      fireEvent.click(clickableHeader);
    }

    // Parameters should be hidden
    expect(screen.queryByText(/\/test\.txt/)).not.toBeInTheDocument();
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

  it("collapses tool_result content when more than 3 lines", () => {
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

    // Should show only first 3 lines with ellipsis by default
    expect(screen.getByText(/Line 1/)).toBeInTheDocument();
    expect(screen.getByText(/Line 2/)).toBeInTheDocument();
    expect(screen.getByText(/Line 3\.\.\./)).toBeInTheDocument();
    expect(screen.queryByText("Line 4")).not.toBeInTheDocument();
    expect(screen.queryByText("Line 5")).not.toBeInTheDocument();

    // Should show expand arrow
    expect(screen.getByText("▶")).toBeInTheDocument();
  });

  it("expands tool_result content when clicked", () => {
    const multiLineContent = "Line 1\nLine 2\nLine 3\nLine 4\nLine 5";
    const block = {
      id: "block-7",
      type: "tool_result",
      content: {
        tool_use_id: "tool-123",
        result: multiLineContent,
        error: null,
      },
    };

    const { container } = render(<BlockDisplay block={block} />);

    // Click to expand - find the clickable header div
    const clickableHeader = container.querySelector(
      '[style*="cursor: pointer"]',
    );
    if (clickableHeader) {
      fireEvent.click(clickableHeader);
    }

    // Should show all lines
    expect(screen.getByText(/Line 4/)).toBeInTheDocument();
    expect(screen.getByText(/Line 5/)).toBeInTheDocument();

    // Should show collapse arrow
    expect(screen.getByText("▼")).toBeInTheDocument();
  });

  it("does not show expand arrow for tool_result with 3 or fewer lines", () => {
    const shortContent = "Line 1\nLine 2\nLine 3";
    const block = {
      id: "block-8",
      type: "tool_result",
      content: {
        tool_use_id: "tool-123",
        result: shortContent,
        error: null,
      },
    };

    render(<BlockDisplay block={block} />);

    // Should show all content
    expect(screen.getByText(/Line 1/)).toBeInTheDocument();
    expect(screen.getByText(/Line 2/)).toBeInTheDocument();
    expect(screen.getByText(/Line 3/)).toBeInTheDocument();

    // Should not show expand arrow
    expect(screen.queryByText("▶")).not.toBeInTheDocument();
    expect(screen.queryByText("▼")).not.toBeInTheDocument();
  });
});
