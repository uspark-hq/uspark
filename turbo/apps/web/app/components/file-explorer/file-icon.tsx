"use client";

import { type JSX } from "react";
import { type FileIconProps } from "./types";

const getFileIcon = (
  fileName: string,
  isDirectory: boolean = false,
): string => {
  if (isDirectory) {
    return "📁";
  }

  const extension = fileName.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "js":
    case "jsx":
      return "📄";
    case "ts":
    case "tsx":
      return "🔷";
    case "json":
      return "📋";
    case "md":
    case "markdown":
      return "📝";
    case "css":
    case "scss":
    case "sass":
      return "🎨";
    case "html":
    case "htm":
      return "🌐";
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "svg":
    case "ico":
      return "🖼️";
    case "pdf":
      return "📄";
    case "txt":
      return "📝";
    case "yml":
    case "yaml":
      return "⚙️";
    case "xml":
      return "📰";
    case "py":
      return "🐍";
    case "java":
      return "☕";
    case "cpp":
    case "c":
    case "h":
      return "⚡";
    case "sh":
    case "bash":
      return "💻";
    default:
      return "📄";
  }
};

export function FileIcon({
  fileName,
  isDirectory = false,
  className = "",
}: FileIconProps): JSX.Element {
  const icon = getFileIcon(fileName, isDirectory);

  return (
    <span className={`file-icon ${className}`} style={{ marginRight: "8px" }}>
      {icon}
    </span>
  );
}
