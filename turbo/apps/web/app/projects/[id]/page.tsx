"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { YjsFileExplorer } from "../../components/file-explorer";
import { GitHubSyncButton } from "../../components/github-sync-button";
import { ChatInterface } from "../../components/claude-chat/chat-interface";
import { parseYjsFileSystem } from "@uspark/core/yjs-filesystem";
import type { FileItem } from "@uspark/core/yjs-filesystem";

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [selectedFile, setSelectedFile] = useState<string>();
  const [fileContent, setFileContent] = useState<string>();
  const [loadingContent, setLoadingContent] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showShareSuccess, setShowShareSuccess] = useState(false);
  const [storeId, setStoreId] = useState<string>();
  const [projectFiles, setProjectFiles] = useState<FileItem[]>([]);
  const shareSuccessTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load store ID on mount
  useEffect(() => {
    async function loadStoreId() {
      try {
        const response = await fetch("/api/blob-store");
        if (response.ok) {
          const data = await response.json();
          setStoreId(data.storeId);
        }
      } catch (error) {
        console.error("Failed to load store ID:", error);
      }
    }

    loadStoreId();
  }, []);

  // Load project files to get hash mapping
  useEffect(() => {
    async function loadProjectFiles() {
      try {
        const response = await fetch(`/api/projects/${projectId}`);
        if (response.ok) {
          const binaryData = await response.arrayBuffer();
          const yjsData = new Uint8Array(binaryData);
          const { files } = parseYjsFileSystem(yjsData);
          setProjectFiles(files);
        }
      } catch (error) {
        console.error("Failed to load project files:", error);
      }
    }

    if (projectId) {
      loadProjectFiles();
    }
  }, [projectId]);

  // Find file hash from path
  const findFileHash = useCallback(
    (path: string, items: FileItem[]): string | undefined => {
      for (const item of items) {
        if (item.path === path && item.type === "file") {
          return item.hash;
        }
        if (item.children) {
          const hash = findFileHash(path, item.children);
          if (hash) return hash;
        }
      }
      return undefined;
    },
    [],
  );

  // Load file content from blob storage
  const loadFileContent = useCallback(
    async (filePath: string) => {
      if (!storeId) {
        console.error("Store ID not loaded");
        setFileContent("");
        return;
      }

      setLoadingContent(true);

      try {
        // Find the file hash from the file path
        const fileHash = findFileHash(filePath, projectFiles);

        if (!fileHash) {
          console.error(`File hash not found for: ${filePath}`);
          setFileContent("");
          return;
        }

        // Construct public blob URL
        const blobUrl = `https://${storeId}.public.blob.vercel-storage.com/${fileHash}`;

        // Download content directly from blob storage (no auth needed for public blobs)
        const response = await fetch(blobUrl);

        if (!response.ok) {
          if (response.status === 404) {
            console.error(`File not found in blob storage: ${fileHash}`);
          } else {
            console.error(`Failed to download file: ${response.statusText}`);
          }
          setFileContent("");
          return;
        }

        const content = await response.text();
        setFileContent(content || "");
      } catch (error) {
        console.error("Error loading file content:", error);
        setFileContent("");
      } finally {
        setLoadingContent(false);
      }
    },
    [storeId, projectFiles, findFileHash],
  );

  useEffect(() => {
    if (selectedFile) {
      loadFileContent(selectedFile);
    } else {
      setFileContent(undefined);
    }
  }, [selectedFile, loadFileContent]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (shareSuccessTimeoutRef.current) {
        clearTimeout(shareSuccessTimeoutRef.current);
      }
    };
  }, []);

  const handleShare = async () => {
    if (!selectedFile) return;

    setIsSharing(true);
    try {
      const response = await fetch("/api/share", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project_id: projectId,
          file_path: selectedFile,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setShowShareSuccess(true);

        // Copy to clipboard
        await navigator.clipboard.writeText(data.url);

        // Hide success message after 3 seconds
        shareSuccessTimeoutRef.current = setTimeout(
          () => setShowShareSuccess(false),
          3000,
        );
      } else {
        console.error("Failed to create share link");
      }
    } catch (error) {
      console.error("Error creating share link:", error);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid rgba(156, 163, 175, 0.2)",
          backgroundColor: "var(--background)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "20px",
              fontWeight: "600",
              margin: 0,
              color: "var(--foreground)",
            }}
          >
            Project: {projectId}
          </h1>
          <p
            style={{
              fontSize: "14px",
              color: "rgba(156, 163, 175, 0.8)",
              margin: "4px 0 0 0",
            }}
          >
            Browse files and collaborate with Claude Code
          </p>
        </div>

        <nav style={{ display: "flex", gap: "12px" }}>
          <GitHubSyncButton projectId={projectId} />
          <button
            onClick={() => window.history.back()}
            style={{
              padding: "8px 16px",
              fontSize: "14px",
              color: "rgba(156, 163, 175, 0.8)",
              textDecoration: "none",
              border: "1px solid rgba(156, 163, 175, 0.2)",
              borderRadius: "4px",
              backgroundColor: "transparent",
              cursor: "pointer",
            }}
          >
            ← Back to Projects
          </button>
        </nav>
      </header>

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "300px 1fr 400px",
          gap: "1px",
          backgroundColor: "rgba(156, 163, 175, 0.1)",
          overflow: "hidden",
        }}
      >
        {/* File Explorer */}
        <div
          style={{
            backgroundColor: "var(--background)",
            overflow: "auto",
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid rgba(156, 163, 175, 0.1)",
              fontSize: "14px",
              fontWeight: "500",
              color: "var(--foreground)",
            }}
          >
            📁 Project Files
          </div>
          <YjsFileExplorer
            projectId={projectId}
            onFileSelect={setSelectedFile}
            selectedFile={selectedFile}
            showMetadata={true}
          />
        </div>

        {/* Document Viewer */}
        <div
          style={{
            backgroundColor: "var(--background)",
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid rgba(156, 163, 175, 0.1)",
              fontSize: "14px",
              fontWeight: "500",
              color: "var(--foreground)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>
              {selectedFile ? `📄 ${selectedFile}` : "📄 Document Viewer"}
            </span>
            {selectedFile && (
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                {showShareSuccess && (
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#10b981",
                      animation: "fadeIn 0.3s ease-in",
                    }}
                  >
                    ✓ Link copied to clipboard!
                  </span>
                )}
                <button
                  onClick={handleShare}
                  disabled={isSharing}
                  style={{
                    padding: "4px 12px",
                    fontSize: "12px",
                    color: "#3b82f6",
                    backgroundColor: "transparent",
                    border: "1px solid #3b82f6",
                    borderRadius: "4px",
                    cursor: isSharing ? "not-allowed" : "pointer",
                    opacity: isSharing ? 0.5 : 1,
                    transition: "all 0.2s ease",
                  }}
                  onMouseOver={(e) => {
                    if (!isSharing) {
                      e.currentTarget.style.backgroundColor = "#3b82f6";
                      e.currentTarget.style.color = "white";
                    }
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "#3b82f6";
                  }}
                >
                  {isSharing ? "Sharing..." : "Share"}
                </button>
                <span
                  style={{
                    fontSize: "12px",
                    color: "rgba(156, 163, 175, 0.6)",
                  }}
                >
                  Read-only preview
                </span>
              </div>
            )}
          </div>

          <div style={{ flex: 1, padding: "16px" }}>
            {loadingContent ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "200px",
                  color: "rgba(156, 163, 175, 0.6)",
                  fontSize: "14px",
                }}
              >
                Loading file content...
              </div>
            ) : selectedFile && fileContent ? (
              <pre
                style={{
                  margin: 0,
                  padding: "16px",
                  backgroundColor: "rgba(156, 163, 175, 0.05)",
                  border: "1px solid rgba(156, 163, 175, 0.1)",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontFamily:
                    'Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
                  lineHeight: "1.5",
                  color: "var(--foreground)",
                  overflow: "auto",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {fileContent}
              </pre>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "300px",
                  color: "rgba(156, 163, 175, 0.6)",
                  fontSize: "14px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>📄</div>
                <div style={{ marginBottom: "8px", fontWeight: "500" }}>
                  Select a file to view its content
                </div>
                <div style={{ fontSize: "12px", maxWidth: "300px" }}>
                  Click on any file in the explorer to see its content here.
                  Files are loaded from the YJS document and blob storage.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Claude Chat Interface */}
        <div
          style={{
            backgroundColor: "var(--background)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid rgba(156, 163, 175, 0.1)",
              fontSize: "14px",
              fontWeight: "500",
              color: "var(--foreground)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>💬</span>
            <span>Claude Chat</span>
          </div>
          <div style={{ flex: 1, overflow: "hidden" }}>
            <ChatInterface projectId={projectId} />
          </div>
        </div>
      </div>
    </div>
  );
}
