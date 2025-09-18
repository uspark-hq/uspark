"use client";

import { useState } from "react";

interface BlockProps {
  block: {
    id: string;
    type: string;
    content: Record<string, unknown>;
    sequence_number: number;
  };
}

export function BlockDisplay({ block }: BlockProps) {
  const [isExpanded, setIsExpanded] = useState(true);

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
            💭 {(block.content?.text as string) || "Thinking..."}
          </div>
        );

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
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "8px",
                cursor: "pointer",
              }}
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <span style={{ fontSize: "16px" }}>🔧</span>
              <span style={{ fontWeight: "500", color: "#3b82f6" }}>
                Tool: {(block.content?.tool_name as string) || "Unknown"}
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: "11px",
                  color: "rgba(156, 163, 175, 0.6)",
                }}
              >
                {isExpanded ? "▼" : "▶"}
              </span>
            </div>
            {isExpanded && block.content?.parameters != null && (
              <pre
                style={{
                  margin: "8px 0 0 0",
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

      case "tool_result":
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
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "8px",
                cursor: "pointer",
              }}
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <span style={{ fontSize: "16px" }}>
                {block.content?.error ? "❌" : "✅"}
              </span>
              <span
                style={{
                  fontWeight: "500",
                  color: block.content?.error ? "#ef4444" : "#22c55e",
                }}
              >
                Tool Result
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: "11px",
                  color: "rgba(156, 163, 175, 0.6)",
                }}
              >
                {isExpanded ? "▼" : "▶"}
              </span>
            </div>
            {isExpanded && (
              <div
                style={{
                  marginTop: "8px",
                  padding: "8px",
                  backgroundColor: "rgba(0, 0, 0, 0.03)",
                  borderRadius: "4px",
                  fontSize: "12px",
                  fontFamily: "monospace",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  maxHeight: "300px",
                  overflow: "auto",
                }}
              >
                {block.content?.error
                  ? `Error: ${block.content.error}`
                  : block.content?.result || "No result"}
              </div>
            )}
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
