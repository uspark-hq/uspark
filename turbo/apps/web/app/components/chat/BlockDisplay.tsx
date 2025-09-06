import React, { useState } from 'react';

interface Block {
  id: string;
  turnId: string;
  type: 'thinking' | 'tool_use' | 'text' | 'error';
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

interface BlockDisplayProps {
  block: Block;
}

export function BlockDisplay({ block }: BlockDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const renderContent = () => {
    switch (block.type) {
      case 'thinking':
        return (
          <ThinkingBlock
            content={block.content}
            isExpanded={isExpanded}
            onToggle={() => setIsExpanded(!isExpanded)}
          />
        );
      case 'tool_use':
        return (
          <ToolUseBlock
            content={block.content}
            metadata={block.metadata}
            isExpanded={isExpanded}
            onToggle={() => setIsExpanded(!isExpanded)}
          />
        );
      case 'text':
        return <TextBlock content={block.content} />;
      case 'error':
        return <ErrorBlock content={block.content} />;
      default:
        return <TextBlock content={block.content} />;
    }
  };

  return <div>{renderContent()}</div>;
}

function ThinkingBlock({
  content,
  isExpanded,
  onToggle,
}: {
  content: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      style={{
        backgroundColor: 'rgba(59, 130, 246, 0.05)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        borderRadius: '6px',
        overflow: 'hidden',
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontSize: '13px',
          color: '#3b82f6',
          fontWeight: '500',
          textAlign: 'left',
        }}
      >
        <span
          style={{
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
            display: 'inline-block',
          }}
        >
          ▶
        </span>
        💭 Thinking
      </button>
      {isExpanded && (
        <div
          style={{
            padding: '12px',
            fontSize: '13px',
            lineHeight: '1.5',
            color: 'rgba(59, 130, 246, 0.9)',
            borderTop: '1px solid rgba(59, 130, 246, 0.1)',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
}

function ToolUseBlock({
  content,
  metadata,
  isExpanded,
  onToggle,
}: {
  content: string;
  metadata?: Record<string, unknown>;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const toolName = String(metadata?.tool_name || 'Tool');
  const toolIcon = getToolIcon(toolName);

  return (
    <div
      style={{
        backgroundColor: 'rgba(168, 85, 247, 0.05)',
        border: '1px solid rgba(168, 85, 247, 0.2)',
        borderRadius: '6px',
        overflow: 'hidden',
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontSize: '13px',
          color: '#a855f7',
          fontWeight: '500',
          textAlign: 'left',
        }}
      >
        <span
          style={{
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
            display: 'inline-block',
          }}
        >
          ▶
        </span>
        <span>{toolIcon} {toolName}</span>
      </button>
      {isExpanded && (
        <div
          style={{
            padding: '12px',
            fontSize: '12px',
            lineHeight: '1.5',
            borderTop: '1px solid rgba(168, 85, 247, 0.1)',
          }}
        >
          <pre
            style={{
              margin: 0,
              fontFamily: 'Monaco, "Cascadia Code", monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              color: 'var(--foreground)',
              backgroundColor: 'rgba(0, 0, 0, 0.02)',
              padding: '8px',
              borderRadius: '4px',
            }}
          >
            {content}
          </pre>
        </div>
      )}
    </div>
  );
}

function TextBlock({ content }: { content: string }) {
  return (
    <div
      style={{
        fontSize: '14px',
        lineHeight: '1.6',
        color: 'var(--foreground)',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {content}
    </div>
  );
}

function ErrorBlock({ content }: { content: string }) {
  return (
    <div
      style={{
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
        border: '1px solid rgba(239, 68, 68, 0.2)',
        borderRadius: '6px',
        padding: '12px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '8px',
        }}
      >
        <span style={{ fontSize: '14px' }}>⚠️</span>
        <span
          style={{
            fontSize: '13px',
            fontWeight: '500',
            color: '#ef4444',
          }}
        >
          Error
        </span>
      </div>
      <div
        style={{
          fontSize: '13px',
          lineHeight: '1.5',
          color: 'rgba(239, 68, 68, 0.9)',
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap',
        }}
      >
        {content}
      </div>
    </div>
  );
}

function getToolIcon(toolName: string): string {
  const iconMap: Record<string, string> = {
    bash: '🖥️',
    read: '📖',
    write: '✏️',
    edit: '📝',
    grep: '🔍',
    glob: '📂',
    webfetch: '🌐',
    websearch: '🔎',
    task: '🤖',
  };

  const lowerToolName = toolName.toLowerCase();
  for (const [key, icon] of Object.entries(iconMap)) {
    if (lowerToolName.includes(key)) {
      return icon;
    }
  }
  return '🔧';
}