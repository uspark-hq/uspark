import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { BlockDisplay } from "../BlockDisplay";
import type { BlockWithParsedContent } from "../types";

describe("BlockDisplay", () => {
  it("renders thinking block correctly", () => {
    const block: BlockWithParsedContent = {
      id: "block-1",
      turnId: "turn-1",
      type: "thinking",
      content: { text: "Analyzing the request..." },
      sequenceNumber: 0,
    };

    render(<BlockDisplay block={block} />);
    expect(screen.getByText("Thinking")).toBeInTheDocument();
    expect(screen.getByText("Analyzing the request...")).toBeInTheDocument();
    expect(screen.getByText("🤔")).toBeInTheDocument();
  });

  it("renders content block correctly", () => {
    const block: BlockWithParsedContent = {
      id: "block-2",
      turnId: "turn-1",
      type: "content",
      content: { text: "Here is my response" },
      sequenceNumber: 1,
    };

    render(<BlockDisplay block={block} />);
    expect(screen.getByText("Here is my response")).toBeInTheDocument();
    expect(screen.getByText("💬")).toBeInTheDocument();
  });

  it("renders tool_use block correctly", () => {
    const block: BlockWithParsedContent = {
      id: "block-3",
      turnId: "turn-1",
      type: "tool_use",
      content: {
        tool_name: "read_file",
        parameters: { path: "/test/file.ts" },
        tool_use_id: "tool-1",
      },
      sequenceNumber: 2,
    };

    render(<BlockDisplay block={block} />);
    expect(screen.getByText("Tool: read_file")).toBeInTheDocument();
    expect(screen.getByText("🔧")).toBeInTheDocument();
    expect(screen.getByText(/\/test\/file\.ts/)).toBeInTheDocument();
  });

  it("renders successful tool_result block", () => {
    const block: BlockWithParsedContent = {
      id: "block-4",
      turnId: "turn-1",
      type: "tool_result",
      content: {
        tool_use_id: "tool-1",
        result: "File contents here",
        error: null,
      },
      sequenceNumber: 3,
    };

    render(<BlockDisplay block={block} />);
    expect(screen.getByText("Tool Result")).toBeInTheDocument();
    expect(screen.getByText("✔️")).toBeInTheDocument();
    expect(screen.getByText("File contents here")).toBeInTheDocument();
  });

  it("renders failed tool_result block", () => {
    const block: BlockWithParsedContent = {
      id: "block-5",
      turnId: "turn-1",
      type: "tool_result",
      content: {
        tool_use_id: "tool-1",
        result: "",
        error: "File not found",
      },
      sequenceNumber: 4,
    };

    render(<BlockDisplay block={block} />);
    expect(screen.getByText("Tool Result")).toBeInTheDocument();
    expect(screen.getByText("❌")).toBeInTheDocument();
    expect(screen.getByText("Error: File not found")).toBeInTheDocument();
  });

  it("handles expand/collapse for thinking block", () => {
    const block: BlockWithParsedContent = {
      id: "block-1",
      turnId: "turn-1",
      type: "thinking",
      content: { text: "Long thinking process..." },
      sequenceNumber: 0,
    };

    render(<BlockDisplay block={block} />);

    const hideButton = screen.getByText("Hide");
    expect(screen.getByText("Long thinking process...")).toBeInTheDocument();

    fireEvent.click(hideButton);

    expect(screen.getByText("Show")).toBeInTheDocument();
    expect(
      screen.queryByText("Long thinking process..."),
    ).not.toBeInTheDocument();
  });

  it("handles expand/collapse for tool blocks", () => {
    const block: BlockWithParsedContent = {
      id: "block-3",
      turnId: "turn-1",
      type: "tool_use",
      content: {
        tool_name: "test_tool",
        parameters: { key: "value" },
        tool_use_id: "tool-1",
      },
      sequenceNumber: 0,
    };

    const { container } = render(<BlockDisplay block={block} />);

    const hideButton = screen.getByText("Hide");
    expect(container.querySelector("pre")).toBeInTheDocument();

    fireEvent.click(hideButton);

    expect(screen.getByText("Show")).toBeInTheDocument();
    expect(container.querySelector("pre")).not.toBeInTheDocument();
  });

  it("renders unknown block type gracefully", () => {
    const block: BlockWithParsedContent = {
      id: "block-6",
      turnId: "turn-1",
      type: "unknown" as unknown as BlockWithParsedContent["type"],
      content: { text: "Unknown content" },
      sequenceNumber: 0,
    };

    render(<BlockDisplay block={block} />);
    expect(screen.getByText(/Unknown block type/)).toBeInTheDocument();
  });

  it("applies correct styling for each block type", () => {
    const thinkingBlock: BlockWithParsedContent = {
      id: "b1",
      turnId: "t1",
      type: "thinking",
      content: { text: "test" },
      sequenceNumber: 0,
    };

    const { container: thinkingContainer } = render(
      <BlockDisplay block={thinkingBlock} />,
    );
    expect(
      thinkingContainer.querySelector(".bg-purple-50"),
    ).toBeInTheDocument();

    const contentBlock: BlockWithParsedContent = {
      id: "b2",
      turnId: "t1",
      type: "content",
      content: { text: "test" },
      sequenceNumber: 0,
    };

    const { container: contentContainer } = render(
      <BlockDisplay block={contentBlock} />,
    );
    expect(contentContainer.querySelector(".bg-gray-50")).toBeInTheDocument();

    const toolBlock: BlockWithParsedContent = {
      id: "b3",
      turnId: "t1",
      type: "tool_use",
      content: { tool_name: "test", parameters: {}, tool_use_id: "t1" },
      sequenceNumber: 0,
    };

    const { container: toolContainer } = render(
      <BlockDisplay block={toolBlock} />,
    );
    expect(toolContainer.querySelector(".bg-blue-50")).toBeInTheDocument();
  });
});
