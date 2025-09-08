import React, { useState } from "react";
import type {
  ThinkingBlockContent,
  ContentBlockContent,
  ToolUseBlockContent,
  ToolResultBlockContent,
} from "../../db/schema/sessions";
import type { BlockWithParsedContent } from "./types";

interface BlockDisplayProps {
  block: BlockWithParsedContent;
}

export function BlockDisplay({ block }: BlockDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const renderThinkingBlock = (content: ThinkingBlockContent) => {
    return (
      <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-purple-600">🤔</span>
            <span className="text-xs font-medium text-purple-700">
              Thinking
            </span>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-purple-400 hover:text-purple-600 text-xs"
          >
            {isExpanded ? "Hide" : "Show"}
          </button>
        </div>
        {isExpanded && (
          <p className="text-sm text-purple-900 whitespace-pre-wrap">
            {content.text}
          </p>
        )}
      </div>
    );
  };

  const renderContentBlock = (content: ContentBlockContent) => {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <div className="flex items-start gap-2">
          <span className="text-gray-600 mt-0.5">💬</span>
          <p className="text-sm text-gray-800 whitespace-pre-wrap flex-1">
            {content.text}
          </p>
        </div>
      </div>
    );
  };

  const renderToolUseBlock = (content: ToolUseBlockContent) => {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-blue-600">🔧</span>
            <span className="text-xs font-medium text-blue-700">
              Tool: {content.tool_name}
            </span>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-blue-400 hover:text-blue-600 text-xs"
          >
            {isExpanded ? "Hide" : "Show"}
          </button>
        </div>
        {isExpanded && (
          <div className="bg-white rounded p-2 mt-2">
            <pre className="text-xs text-gray-700 overflow-x-auto">
              {JSON.stringify(content.parameters, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  };

  const renderToolResultBlock = (content: ToolResultBlockContent) => {
    const isError = !!content.error;
    return (
      <div
        className={`border rounded-md p-3 ${
          isError ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={isError ? "text-red-600" : "text-green-600"}>
              {isError ? "❌" : "✔️"}
            </span>
            <span
              className={`text-xs font-medium ${
                isError ? "text-red-700" : "text-green-700"
              }`}
            >
              Tool Result
            </span>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`text-xs ${
              isError
                ? "text-red-400 hover:text-red-600"
                : "text-green-400 hover:text-green-600"
            }`}
          >
            {isExpanded ? "Hide" : "Show"}
          </button>
        </div>
        {isExpanded && (
          <div className="bg-white rounded p-2 mt-2">
            {isError ? (
              <p className="text-xs text-red-700">Error: {content.error}</p>
            ) : (
              <pre className="text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap">
                {content.result}
              </pre>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderBlock = () => {
    switch (block.type) {
      case "thinking":
        return renderThinkingBlock(block.content as ThinkingBlockContent);
      case "content":
        return renderContentBlock(block.content as ContentBlockContent);
      case "tool_use":
        return renderToolUseBlock(block.content as ToolUseBlockContent);
      case "tool_result":
        return renderToolResultBlock(block.content as ToolResultBlockContent);
      default:
        return (
          <div className="bg-gray-100 border border-gray-300 rounded-md p-3">
            <p className="text-sm text-gray-600">
              Unknown block type: {block.type}
            </p>
          </div>
        );
    }
  };

  return <div className="block-display">{renderBlock()}</div>;
}
