"use client";

import { notFound } from "next/navigation";
import { useState, useEffect } from "react";

interface SharePageProps {
  params: Promise<{
    token: string;
  }>;
}

interface ShareMetadata {
  project_name: string;
  file_path: string;
  hash: string;
  mtime: number;
}

async function fetchShareMetadata(
  token: string,
): Promise<ShareMetadata | null> {
  try {
    const response = await fetch(`/api/share/${token}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to fetch share metadata:", error);
    return null;
  }
}

async function fetchFileContent(token: string): Promise<string | null> {
  try {
    const response = await fetch(`/api/share/${token}/content`, {
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("Failed to fetch file content:", response.status);
      return null;
    }

    return await response.text();
  } catch (error) {
    console.error("Failed to fetch file content:", error);
    return null;
  }
}

export default function SharePage({ params }: SharePageProps) {
  const [metadata, setMetadata] = useState<ShareMetadata | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    async function getParams() {
      const resolvedParams = await params;
      setToken(resolvedParams.token);
    }
    getParams();
  }, [params]);

  useEffect(() => {
    if (!token) return;

    async function loadShareData() {
      setLoading(true);

      // First, fetch the metadata
      const meta = await fetchShareMetadata(token!);

      if (!meta) {
        setError("Share not found");
        setLoading(false);
        return;
      }

      setMetadata(meta);

      // Then, fetch the actual content using the token
      const fileContent = await fetchFileContent(token!);

      if (fileContent === null) {
        // If blob fetch fails, show a message but don't error out completely
        setContent("");
        console.warn("Could not fetch file content from blob storage");
      } else {
        setContent(fileContent);
      }

      setLoading(false);
    }

    loadShareData();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading shared content...</p>
        </div>
      </div>
    );
  }

  if (error || !metadata) {
    notFound();
    return null; // Prevent rendering with null metadata
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-2 sm:p-4 max-w-7xl">
        <header className="mb-4 sm:mb-6">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 break-words">
            {metadata.project_name}
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Shared document • Read-only
          </p>
        </header>

        <div className="h-[calc(100vh-120px)] sm:h-[calc(100vh-180px)]">
          {/* Document Viewer */}
          <main className="w-full h-full">
            <div className="bg-white rounded-lg shadow-sm border h-full min-h-[400px] overflow-hidden">
              {content !== null ? (
                <DocumentViewer
                  filePath={metadata.file_path}
                  content={content}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center p-4">
                    <div className="text-3xl mb-4">⚠️</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Content Temporarily Unavailable
                    </h3>
                    <p className="text-gray-600">
                      File storage integration is being configured.
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Hash: {metadata.hash}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

interface DocumentViewerProps {
  filePath: string;
  content: string;
}

function DocumentViewer({ filePath, content }: DocumentViewerProps) {
  const getFileExtension = (path: string) => {
    const parts = path.split(".");
    return parts.length > 1 ? parts[parts.length - 1]?.toLowerCase() || "" : "";
  };

  const fileExtension = getFileExtension(filePath);
  const isMarkdown = fileExtension === "md" || fileExtension === "markdown";

  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filePath.split("/").pop() || "file";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // If content is empty, show a placeholder
  if (!content) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-4">
          <div className="text-3xl mb-4">📄</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {filePath.split("/").pop()}
          </h3>
          <p className="text-gray-600 mb-4">
            File preview is not available yet.
          </p>
          <p className="text-xs text-gray-500">
            The file storage system is being configured.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* File header */}
      <div className="border-b p-2 sm:p-4 bg-gray-50 flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs sm:text-sm font-mono text-gray-600 truncate">
            {filePath}
          </h3>
          {!isMarkdown && content && (
            <button
              onClick={handleDownload}
              className="text-xs bg-blue-600 text-white px-2 sm:px-3 py-1 rounded hover:bg-blue-700 flex-shrink-0"
            >
              Download
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isMarkdown ? (
          <div className="p-4">
            <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">
              {content}
            </pre>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-4">
              <div className="text-4xl mb-4">📄</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {filePath.split("/").pop()}
              </h3>
              <p className="text-gray-600 mb-4">
                This file type cannot be displayed in the browser.
              </p>
              <button
                onClick={handleDownload}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Download File
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
