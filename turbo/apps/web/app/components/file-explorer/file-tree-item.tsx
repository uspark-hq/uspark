"use client";

import { type JSX } from "react";
import { type FileTreeItemProps } from "./types";
import { FileIcon } from "./file-icon";

export function FileTreeItem({
  item,
  level,
  isExpanded,
  onToggle,
  onFileSelect,
  selectedFile,
  renderChildren
}: FileTreeItemProps): JSX.Element {
  const isSelected = selectedFile === item.path;
  const hasChildren = item.children && item.children.length > 0;
  const isDirectory = item.type === 'directory';

  const handleClick = () => {
    if (isDirectory && hasChildren) {
      onToggle(item.path);
    } else if (!isDirectory && onFileSelect) {
      onFileSelect(item.path);
    }
  };

  const indentStyle = {
    paddingLeft: `${level * 20}px`
  };

  const itemStyle = {
    display: 'flex',
    alignItems: 'center',
    padding: '4px 8px',
    cursor: 'pointer',
    backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
    borderLeft: isSelected ? '3px solid #3b82f6' : '3px solid transparent',
    ':hover': {
      backgroundColor: 'rgba(156, 163, 175, 0.1)'
    }
  };

  const fileName = item.path.split('/').pop() || item.path;

  return (
    <div>
      <div
        style={{ ...itemStyle, ...indentStyle }}
        onClick={handleClick}
        className="file-tree-item"
        onMouseEnter={(e) => {
          if (!isSelected) {
            e.currentTarget.style.backgroundColor = 'rgba(156, 163, 175, 0.1)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        {isDirectory && hasChildren && (
          <span
            style={{
              marginRight: '4px',
              fontSize: '12px',
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.1s ease'
            }}
          >
            ▶
          </span>
        )}
        {(!isDirectory || !hasChildren) && (
          <span style={{ marginRight: '16px' }} />
        )}
        <FileIcon fileName={fileName} isDirectory={isDirectory} />
        <span style={{ fontSize: '14px', color: 'var(--foreground)' }}>
          {fileName}
        </span>
      </div>
      
      {isDirectory && hasChildren && isExpanded && renderChildren && (
        <div>
          {renderChildren(item.children!)}
        </div>
      )}
    </div>
  );
}