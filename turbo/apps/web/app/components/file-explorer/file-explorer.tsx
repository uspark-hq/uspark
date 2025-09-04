"use client";

import { useState, type JSX } from "react";
import { type FileExplorerProps, type FileItem } from "./types";
import { FileTreeItem } from "./file-tree-item";

export function FileExplorer({
  files,
  onFileSelect,
  selectedFile,
  className = ""
}: FileExplorerProps): JSX.Element {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  const handleToggle = (path: string) => {
    setExpandedPaths(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const renderFileTree = (items: FileItem[], level: number = 0): JSX.Element[] => {
    return items.map((item) => (
      <FileTreeItem
        key={item.path}
        item={item}
        level={level}
        isExpanded={expandedPaths.has(item.path)}
        onToggle={handleToggle}
        onFileSelect={onFileSelect}
        selectedFile={selectedFile}
        renderChildren={(children) => renderFileTree(children, level + 1)}
      />
    ));
  };

  const containerStyle = {
    border: '1px solid rgba(156, 163, 175, 0.2)',
    borderRadius: '4px',
    backgroundColor: 'var(--background)',
    overflow: 'hidden',
    fontFamily: 'monospace',
    fontSize: '14px'
  };

  if (!files || files.length === 0) {
    return (
      <div className={`file-explorer ${className}`} style={containerStyle}>
        <div style={{ padding: '16px', textAlign: 'center', color: 'rgba(156, 163, 175, 0.7)' }}>
          No files to display
        </div>
      </div>
    );
  }

  return (
    <div className={`file-explorer ${className}`} style={containerStyle}>
      <div style={{ padding: '8px 0' }}>
        {renderFileTree(files)}
      </div>
    </div>
  );
}