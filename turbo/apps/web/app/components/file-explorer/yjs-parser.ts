"use client";

import * as Y from "yjs";
import { type FileItem } from "./types";

export interface FileNode {
  hash: string;
  mtime: number;
}

export interface BlobInfo {
  size: number;
}

export interface YjsFileSystemData {
  files: FileItem[];
  totalSize: number;
  fileCount: number;
}

/**
 * Parses YJS document and extracts filesystem structure
 * @param ydocData Binary YJS document data
 * @returns Parsed filesystem data
 */
export function parseYjsFileSystem(ydocData: Uint8Array): YjsFileSystemData {
  const ydoc = new Y.Doc();

  // Apply the YJS update to reconstruct the document
  Y.applyUpdate(ydoc, ydocData);

  // Get the files and blobs maps from YJS document
  const filesMap = ydoc.getMap<FileNode>("files");
  const blobsMap = ydoc.getMap<BlobInfo>("blobs");

  // Extract file paths and metadata
  const fileEntries: Array<{
    path: string;
    metadata: FileNode;
    size?: number;
  }> = [];

  filesMap.forEach((metadata, path) => {
    // Get size from blobs map if available
    const blobInfo = blobsMap.get(metadata.hash);
    fileEntries.push({
      path,
      metadata,
      size: blobInfo?.size,
    });
  });

  // Convert to flat file list format expected by buildFileTree
  const flatFiles = fileEntries.map((entry) => ({
    path: entry.path,
    type: "file" as const,
    size: entry.size,
    mtime: entry.metadata.mtime,
    hash: entry.metadata.hash,
  }));

  // Build tree structure
  const fileTree = buildFileTreeFromYjs(flatFiles);

  // Calculate totals
  const totalSize = fileEntries.reduce(
    (sum, entry) => sum + (entry.size || 0),
    0,
  );
  const fileCount = fileEntries.length;

  return {
    files: fileTree,
    totalSize,
    fileCount,
  };
}

/**
 * Builds file tree from YJS file entries, creating intermediate directories
 * @param files Flat array of files with YJS metadata
 * @returns Hierarchical file tree
 */
function buildFileTreeFromYjs(
  files: Array<{
    path: string;
    type: "file";
    size?: number;
    mtime: number;
    hash: string;
  }>,
): FileItem[] {
  const fileMap = new Map<string, FileItem>();
  const result: FileItem[] = [];

  // Sort files to ensure consistent ordering
  const sortedFiles = files.sort((a, b) => a.path.localeCompare(b.path));

  for (const file of sortedFiles) {
    const parts = file.path.split("/").filter(Boolean);
    let currentPath = "";

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue; // Skip if part is somehow undefined
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (!fileMap.has(currentPath)) {
        const isLastPart = i === parts.length - 1;

        const item: FileItem = {
          path: currentPath,
          type: isLastPart ? "file" : "directory",
          size: isLastPart ? file.size : undefined,
          children: isLastPart ? undefined : [],
          // Add YJS-specific metadata for files
          ...(isLastPart && {
            mtime: file.mtime,
            hash: file.hash,
          }),
        };

        fileMap.set(currentPath, item);

        // Establish parent-child relationships
        if (parentPath) {
          const parent = fileMap.get(parentPath);
          if (parent && parent.children) {
            parent.children.push(item);
          }
        } else {
          result.push(item);
        }
      }
    }
  }

  // Recursively sort children: directories first, then files, alphabetically
  const sortChildren = (items: FileItem[]) => {
    items.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "directory" ? -1 : 1;
      }
      // Get file names for comparison
      const aName = a.path.split("/").pop() || a.path;
      const bName = b.path.split("/").pop() || b.path;
      return aName.localeCompare(bName);
    });

    items.forEach((item) => {
      if (item.children && item.children.length > 0) {
        sortChildren(item.children);
      }
    });
  };

  sortChildren(result);
  return result;
}

/**
 * Formats file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Formats timestamp in human-readable format
 */
export function formatModifiedTime(mtime: number): string {
  return new Date(mtime).toLocaleString();
}
