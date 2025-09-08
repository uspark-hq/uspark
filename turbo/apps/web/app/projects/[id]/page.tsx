"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { YjsFileExplorer } from "../../components/file-explorer";
import { ChatWithAPI } from "../../../src/components/chat";

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;

  // File explorer state
  const [selectedFile, setSelectedFile] = useState<string>();
  const [fileContent, setFileContent] = useState<string>();
  const [loadingContent, setLoadingContent] = useState(false);

  // Share functionality
  const [isSharing, setIsSharing] = useState(false);
  const [showShareSuccess, setShowShareSuccess] = useState(false);

  // Layout state
  const [chatWidth, setChatWidth] = useState(400);
  const [fileExplorerWidth, setFileExplorerWidth] = useState(280);
  const [isResizingChat, setIsResizingChat] = useState(false);
  const [isResizingExplorer, setIsResizingExplorer] = useState(false);

  // Mock file content loading for now
  const loadFileContent = async (filePath: string) => {
    setLoadingContent(true);

    // Mock content based on file extension
    const ext = filePath.split(".").pop()?.toLowerCase();
    let mockContent = "";

    switch (ext) {
      case "ts":
      case "tsx":
        mockContent = `// ${filePath}
import React from 'react';

export function Component() {
  return (
    <div>
      <h1>Hello from ${filePath}</h1>
      <p>This is a sample TypeScript component.</p>
    </div>
  );
}`;
        break;
      case "json":
        mockContent = JSON.stringify(
          {
            name: "example-project",
            version: "1.0.0",
            description: `Content for ${filePath}`,
            dependencies: {
              react: "^18.0.0",
              next: "^14.0.0",
            },
          },
          null,
          2,
        );
        break;
      case "md":
        mockContent = `# ${filePath}

This is a markdown file with rich content.

## Features

- **Bold text** for emphasis
- *Italic text* for style
- \`inline code\` for technical terms

### Code Example

\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
\`\`\`

### Task List

- [x] Design the layout
- [x] Implement chat integration
- [ ] Add real-time collaboration
- [ ] Deploy to production`;
        break;
      default:
        mockContent = `Content of ${filePath}

This is sample file content.
You can edit this file using Claude Code.

Lines of code...
More lines...
Even more lines...`;
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
        setTimeout(() => setShowShareSuccess(false), 3000);
      } else {
        console.error("Failed to create share link");
      }
    } catch (error) {
      console.error("Error creating share link:", error);
    } finally {
      setIsSharing(false);
    }
  };

  // Handle resize for chat panel
  const handleChatResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingChat(true);
  };

  // Handle resize for file explorer
  const handleExplorerResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingExplorer(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingChat) {
        const newWidth = Math.max(300, Math.min(600, e.clientX));
        setChatWidth(newWidth);
      }
      if (isResizingExplorer) {
        const newWidth = Math.max(
          200,
          Math.min(500, window.innerWidth - e.clientX),
        );
        setFileExplorerWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizingChat(false);
      setIsResizingExplorer(false);
    };

    if (isResizingChat || isResizingExplorer) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isResizingChat, isResizingExplorer]);

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Project: {projectId}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Collaborate with Claude Code on your project files
            </p>
          </div>
          <nav className="flex items-center gap-3">
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              ← Back to Projects
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area - Three Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Chat */}
        <div
          className="bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col"
          style={{ width: `${chatWidth}px` }}
        >
          <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              💬 Chat with Claude
            </h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatWithAPI
              projectId={projectId}
              sessionId={`session-${projectId}`}
            />
          </div>
        </div>

        {/* Resize Handle for Chat */}
        <div
          className="w-1 bg-gray-200 dark:bg-gray-700 hover:bg-blue-500 dark:hover:bg-blue-400 cursor-col-resize transition-colors"
          onMouseDown={handleChatResize}
        />

        {/* Middle - Document Content */}
        <div className="flex-1 bg-white dark:bg-gray-800 flex flex-col min-w-0">
          {/* Document Header */}
          <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">
                {selectedFile
                  ? `📄 ${selectedFile}`
                  : "📄 Select a file to view"}
              </h2>
              {selectedFile && (
                <div className="flex items-center gap-3">
                  {showShareSuccess && (
                    <span className="text-xs text-green-600 dark:text-green-400 animate-fade-in">
                      ✓ Link copied!
                    </span>
                  )}
                  <button
                    onClick={handleShare}
                    disabled={isSharing}
                    className="px-3 py-1 text-xs text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSharing ? "Sharing..." : "Share"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Document Content */}
          <div className="flex-1 overflow-auto p-6">
            {loadingContent ? (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mx-auto mb-4"></div>
                  <p className="text-sm">Loading file content...</p>
                </div>
              </div>
            ) : selectedFile && fileContent ? (
              <div className="max-w-4xl mx-auto">
                <pre className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 overflow-x-auto">
                  <code className="text-sm text-gray-800 dark:text-gray-200 font-mono">
                    {fileContent}
                  </code>
                </pre>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <div className="text-center max-w-sm">
                  <div className="text-6xl mb-4">📄</div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No file selected
                  </h3>
                  <p className="text-sm">
                    Select a file from the explorer to view and edit its content
                    with Claude Code
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Resize Handle for Explorer */}
        <div
          className="w-1 bg-gray-200 dark:bg-gray-700 hover:bg-blue-500 dark:hover:bg-blue-400 cursor-col-resize transition-colors"
          onMouseDown={handleExplorerResize}
        />

        {/* Right Sidebar - File Explorer */}
        <div
          className="bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col"
          style={{ width: `${fileExplorerWidth}px` }}
        >
          <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              📁 Project Files
            </h2>
          </div>
          <div className="flex-1 overflow-auto">
            <YjsFileExplorer
              projectId={projectId}
              onFileSelect={setSelectedFile}
              selectedFile={selectedFile}
              showMetadata={true}
            />
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 py-2">
        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Claude Code Ready
            </span>
            {selectedFile && <span>Editing: {selectedFile}</span>}
          </div>
          <div className="flex items-center gap-4">
            <span>Project ID: {projectId}</span>
            <span>UTF-8</span>
          </div>
        </div>
      </div>
    </div>
  );
}
