import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BlockDisplay } from "../block-display";

describe("BlockDisplay", () => {
  it("renders thinking block correctly", () => {
    const block = {
      id: "block-1",
      type: "thinking",
      content: { text: "Analyzing the request..." },
      sequenceNumber: 0,
    };

    render(<BlockDisplay block={block} />);
    expect(screen.getByText(/Analyzing the request/)).toBeInTheDocument();
  });

  it("renders content block correctly", () => {
    const block = {
      id: "block-2",
      type: "content",
      content: { text: "Here is my response" },
      sequenceNumber: 1,
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
      sequenceNumber: 2,
    };

    render(<BlockDisplay block={block} />);
    expect(screen.getByText(/Tool: read_file/)).toBeInTheDocument();

    // Should show parameters by default
    expect(screen.getByText(/\/test\.txt/)).toBeInTheDocument();

    // Click to collapse
    const header = screen.getByText(/Tool: read_file/).parentElement;
    fireEvent.click(header!);

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
      sequenceNumber: 3,
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
      sequenceNumber: 4,
    };

    render(<BlockDisplay block={block} />);
    expect(screen.getByText("File content here")).toBeInTheDocument();
  });
});
