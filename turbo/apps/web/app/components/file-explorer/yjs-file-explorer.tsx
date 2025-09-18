"use client";

import { useState, useEffect, type JSX } from "react";
import { FileExplorer } from "./file-explorer";
import { parseYjsFileSystem, formatFileSize } from "./yjs-parser";
import { type FileItem } from "./types";

interface YjsFileExplorerProps {
  projectId: string;
  onFileSelect?: (filePath: string) => void;
  selectedFile?: string;
  className?: string;
  showMetadata?: boolean; // Whether to show file metadata (size, modified time)
}

interface ProjectData {
  files: FileItem[];
  totalSize: number;
  fileCount: number;
  loading: boolean;
  error?: string;
}

export function YjsFileExplorer({
  projectId,
  onFileSelect,
  selectedFile,
  className = "",
  showMetadata = true,
}: YjsFileExplorerProps): JSX.Element {
  const [projectData, setProjectData] = useState<ProjectData>({
    files: [],
    totalSize: 0,
    fileCount: 0,
    loading: true,
  });

  useEffect(() => {
    async function loadProjectFiles() {
      setProjectData((prev) => ({ ...prev, loading: prev.files.length === 0, error: undefined }));

      try {
        // Fetch YJS document from the API
        const response = await fetch(`/api/projects/${projectId}`, {
          headers: {
            'Cache-Control': 'no-cache',
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to load project: ${response.statusText}`);
        }

        // Get binary YJS data
        const binaryData = await response.arrayBuffer();
        const yjsData = new Uint8Array(binaryData);

        // Parse filesystem from YJS document
        const { files, totalSize, fileCount } = parseYjsFileSystem(yjsData);

        setProjectData({
          files,
          totalSize,
          fileCount,
          loading: false,
        });
      } catch (error) {
        setProjectData((prev) => ({
          ...prev,
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to load project files",
        }));
      }
    }

    if (projectId) {
      // Initial load
      loadProjectFiles();

      // Set up polling for real-time updates
      const pollInterval = setInterval(loadProjectFiles, 3000); // Poll every 3 seconds

      return () => {
        clearInterval(pollInterval);
      };
    }
  }, [projectId]);

  if (projectData.loading) {
    return (
      <div className={`yjs-file-explorer ${className}`}>
        <div
          style={{
            padding: "20px",
            textAlign: "center",
            color: "rgba(156, 163, 175, 0.7)",
            fontSize: "14px",
          }}
        >
          <div style={{ marginBottom: "8px" }}>📁</div>
          Loading project files...
        </div>
      </div>
    );
  }

  if (projectData.error) {
    return (
      <div className={`yjs-file-explorer ${className}`}>
        <div
          style={{
            padding: "20px",
            textAlign: "center",
            color: "#ef4444",
            fontSize: "14px",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            borderRadius: "4px",
            backgroundColor: "rgba(239, 68, 68, 0.05)",
          }}
        >
          <div style={{ marginBottom: "8px" }}>⚠️</div>
          <div style={{ fontWeight: "500", marginBottom: "4px" }}>
            Failed to load project
          </div>
          <div style={{ fontSize: "12px", opacity: 0.8 }}>
            {projectData.error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`yjs-file-explorer ${className}`}>
      {showMetadata && projectData.fileCount > 0 && (
        <div
          style={{
            padding: "8px 12px",
            fontSize: "12px",
            color: "rgba(156, 163, 175, 0.8)",
            borderBottom: "1px solid rgba(156, 163, 175, 0.1)",
            backgroundColor: "rgba(156, 163, 175, 0.03)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>
            {projectData.fileCount} file{projectData.fileCount !== 1 ? "s" : ""}
          </span>
          <span>{formatFileSize(projectData.totalSize)}</span>
        </div>
      )}

      <FileExplorer
        files={projectData.files}
        onFileSelect={onFileSelect}
        selectedFile={selectedFile}
      />
    </div>
  );
}
