"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { YjsFileExplorer } from "../../components/file-explorer";
import { GitHubSyncButton } from "../../components/github-sync-button";

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [selectedFile, setSelectedFile] = useState<string>();
  const [fileContent, setFileContent] = useState<string>();
  const [loadingContent, setLoadingContent] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showShareSuccess, setShowShareSuccess] = useState(false);
  const shareSuccessTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Mock file content loading for now
  const loadFileContent = async (filePath: string) => {
    setLoadingContent(true);

    // Mock content based on file extension (no artificial delay)
    const ext = filePath.split(".").pop()?.toLowerCase();
    let mockContent = "";

    switch (ext) {
      case "ts":
      case "tsx":
        mockContent = `// ${filePath}\nexport function Component() {\n  return <div>Hello from ${filePath}</div>;\n}`;
        break;
      case "json":
        mockContent = JSON.stringify(
          {
            name: "example-project",
            version: "1.0.0",
            description: `Content for ${filePath}`,
          },
          null,
          2,
        );
        break;
      case "md":
        mockContent = `# ${filePath}\n\nThis is a markdown file.\n\n## Features\n\n- Feature 1\n- Feature 2\n- Feature 3`;
        break;
      default:
        mockContent = `Content of ${filePath}\n\nThis is sample file content.`;
    }

    setFileContent(mockContent);
    setLoadingContent(false);
  };

  useEffect(() => {
    if (selectedFile) {
      loadFileContent(selectedFile);
    } else {
      setFileContent(undefined);
    }
  }, [selectedFile]);

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
          gridTemplateColumns: "300px 1fr",
          gridTemplateRows: "1fr auto",
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
            gridRow: "span 2",
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
                  Click on any file in the explorer to see its content here. In
                  the final implementation, this will show real file content
                  from the YJS document.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat Input */}
        <div
          style={{
            backgroundColor: "var(--background)",
            borderTop: "1px solid rgba(156, 163, 175, 0.1)",
            padding: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "12px",
              alignItems: "center",
            }}
          >
            <div
              style={{
                flex: 1,
                position: "relative",
              }}
            >
              <textarea
                placeholder="Ask Claude Code to modify your project files..."
                style={{
                  width: "100%",
                  minHeight: "80px",
                  padding: "12px",
                  border: "2px solid rgba(156, 163, 175, 0.2)",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontFamily: "inherit",
                  backgroundColor: "var(--background)",
                  color: "var(--foreground)",
                  resize: "vertical",
                  outline: "none",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "rgba(59, 130, 246, 0.5)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(156, 163, 175, 0.2)";
                }}
              />
            </div>
            <button
              style={{
                padding: "12px 24px",
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
                alignSelf: "flex-end",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "#2563eb";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "#3b82f6";
              }}
            >
              Send
            </button>
          </div>

          <div
            style={{
              marginTop: "8px",
              fontSize: "12px",
              color: "rgba(156, 163, 175, 0.6)",
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <span>
              💡 Try: &quot;Add error handling to the login function&quot; or
              &quot;Create a new React component&quot;
            </span>
            <div
              style={{
                padding: "2px 6px",
                backgroundColor: "rgba(156, 163, 175, 0.1)",
                borderRadius: "3px",
                fontSize: "11px",
              }}
            >
              Claude Code Ready
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
