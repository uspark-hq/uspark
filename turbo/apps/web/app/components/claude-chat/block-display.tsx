"use client";

interface BlockProps {
  block: {
    id: string;
    type: string;
    content: Record<string, unknown>;
  };
  blocks?: Array<{
    id: string;
    type: string;
    content: Record<string, unknown>;
  }>;
}

// Helper function to find tool_use block by tool_use_id
function findToolUse(
  blocks: Array<{ id: string; type: string; content: Record<string, unknown> }>,
  toolUseId: string,
): { tool_name: string } | null {
  const toolUseBlock = blocks.find(
    (b) =>
      b.type === "tool_use" && (b.content?.tool_use_id as string) === toolUseId,
  );
  if (toolUseBlock?.content?.tool_name) {
    return { tool_name: toolUseBlock.content.tool_name as string };
  }
  return null;
}

// Helper function to count lines in Read tool result
function countReadLines(result: string): number {
  const lines = result.split("\n");
  return lines.filter((line) => /^\s+\d+→/.test(line)).length;
}

// Helper function to get first N lines
function getFirstNLines(text: string, n: number): string {
  const lines = text.split("\n");
  if (lines.length <= n) {
    return text;
  }
  return lines.slice(0, n).join("\n") + "\n...";
}

// Helper function to get tool result text
function getToolResultText(
  content: Record<string, unknown>,
  toolName?: string,
): {
  text: string;
  isCollapsed: boolean;
} {
  if (content?.error as string) {
    return {
      text: `Error: ${content.error as string}`,
      isCollapsed: false,
    };
  }

  const result = (content?.result as string) || "No result";

  // Check if this is a Read tool result based on tool name
  if (toolName === "Read") {
    const lineCount = countReadLines(result);
    return {
      text: `Read ${lineCount} Lines`,
      isCollapsed: true,
    };
  }

  // For other tools, show max 3 lines
  return {
    text: getFirstNLines(result, 3),
    isCollapsed: result.split("\n").length > 3,
  };
}

export function BlockDisplay({ block, blocks = [] }: BlockProps) {
  const renderContent = () => {
    switch (block.type) {
      case "thinking":
        return (
          <div
            style={{
              padding: "12px",
              backgroundColor: "rgba(147, 51, 234, 0.05)",
              borderLeft: "3px solid #9333ea",
              borderRadius: "4px",
              fontSize: "13px",
              fontStyle: "italic",
              color: "rgba(156, 163, 175, 0.8)",
            }}
          >
            {(block.content?.text as string) || "Thinking..."}
          </div>
        );

      case "text":
      case "content":
        return (
          <div
            style={{
              padding: "12px",
              backgroundColor: "rgba(156, 163, 175, 0.05)",
              borderRadius: "8px",
              fontSize: "14px",
              lineHeight: "1.6",
              whiteSpace: "pre-wrap",
            }}
          >
            {(block.content?.text as string) || ""}
          </div>
        );

      case "tool_use":
        return (
          <div
            style={{
              padding: "12px",
              backgroundColor: "rgba(59, 130, 246, 0.05)",
              border: "1px solid rgba(59, 130, 246, 0.2)",
              borderRadius: "6px",
              fontSize: "13px",
            }}
          >
            <div
              style={{
                fontWeight: "500",
                color: "#3b82f6",
                marginBottom: "8px",
              }}
            >
              Tool: {(block.content?.tool_name as string) || "Unknown"}
            </div>
            {block.content?.parameters != null && (
              <pre
                style={{
                  margin: "0",
                  padding: "8px",
                  backgroundColor: "rgba(0, 0, 0, 0.05)",
                  borderRadius: "4px",
                  fontSize: "12px",
                  fontFamily: "monospace",
                  overflow: "auto",
                  maxHeight: "200px",
                }}
              >
                {JSON.stringify(block.content.parameters, null, 2)}
              </pre>
            )}
          </div>
        );

      case "tool_result": {
        // Find the corresponding tool_use block to get the tool name
        const toolUseId = block.content?.tool_use_id as string;
        const toolUse = toolUseId ? findToolUse(blocks, toolUseId) : null;
        const toolName = toolUse?.tool_name;

        const { text: resultText, isCollapsed } = getToolResultText(
          block.content,
          toolName,
        );

        return (
          <div
            style={{
              padding: "12px",
              backgroundColor: block.content?.error
                ? "rgba(239, 68, 68, 0.05)"
                : "rgba(34, 197, 94, 0.05)",
              border: `1px solid ${
                block.content?.error
                  ? "rgba(239, 68, 68, 0.2)"
                  : "rgba(34, 197, 94, 0.2)"
              }`,
              borderRadius: "6px",
              fontSize: "13px",
            }}
          >
            <div
              style={{
                fontWeight: "500",
                color: block.content?.error ? "#ef4444" : "#22c55e",
                marginBottom: "8px",
              }}
            >
              Tool Result
            </div>
            <div
              style={{
                padding: "8px",
                backgroundColor: "rgba(0, 0, 0, 0.03)",
                borderRadius: "4px",
                fontSize: "12px",
                fontFamily: "monospace",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                ...(isCollapsed
                  ? {}
                  : { maxHeight: "300px", overflow: "auto" }),
              }}
            >
              {resultText}
            </div>
          </div>
        );
      }

      case "code":
        return (
          <div
            style={{
              padding: "12px",
              backgroundColor: "rgba(0, 0, 0, 0.05)",
              borderRadius: "6px",
              fontSize: "13px",
            }}
          >
            <pre
              style={{
                margin: "0",
                fontFamily: "monospace",
                fontSize: "12px",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {(block.content?.code as string) || ""}
            </pre>
          </div>
        );

      case "error":
        return (
          <div
            style={{
              padding: "12px",
              backgroundColor: "rgba(239, 68, 68, 0.05)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              borderRadius: "6px",
              fontSize: "13px",
              color: "#ef4444",
            }}
          >
            <div style={{ fontWeight: "500", marginBottom: "8px" }}>Error</div>
            <div style={{ fontSize: "12px" }}>
              {(block.content?.message as string) || "An error occurred"}
            </div>
          </div>
        );

      default:
        return (
          <div
            style={{
              padding: "12px",
              backgroundColor: "rgba(156, 163, 175, 0.05)",
              borderRadius: "6px",
              fontSize: "13px",
              color: "rgba(156, 163, 175, 0.6)",
            }}
          >
            Unknown block type: {block.type}
          </div>
        );
    }
  };

  return <div style={{ marginBottom: "4px" }}>{renderContent()}</div>;
}
