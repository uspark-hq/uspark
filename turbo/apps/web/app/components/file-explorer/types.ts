import { type JSX } from "react";

export interface FileItem {
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: FileItem[];
  // YJS-specific metadata
  mtime?: number;  // Modification time from YJS
  hash?: string;   // Content hash from YJS
}

export interface FileTree {
  [key: string]: FileItem;
}

export interface FileIconProps {
  fileName: string;
  isDirectory?: boolean;
  className?: string;
}

export interface FileExplorerProps {
  files: FileItem[];
  onFileSelect?: (filePath: string) => void;
  selectedFile?: string;
  className?: string;
}

export interface FileTreeItemProps {
  item: FileItem;
  level: number;
  isExpanded: boolean;
  onToggle: (path: string) => void;
  onFileSelect?: (filePath: string) => void;
  selectedFile?: string;
  renderChildren?: (children: FileItem[]) => JSX.Element[];
}