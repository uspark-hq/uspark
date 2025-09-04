"use client";

import { notFound } from "next/navigation";
import { useState, useEffect } from "react";

interface SharePageProps {
  params: Promise<{
    token: string;
  }>;
}

interface ShareData {
  project_name: string;
  file_path: string;
  content: string;
}

async function fetchShareData(token: string): Promise<ShareData | null> {
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
    console.error("Failed to fetch share data:", error);
    return null;
  }
}

export default function SharePage({ params }: SharePageProps) {
  const [shareData, setShareData] = useState<ShareData | null>(null);
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
      const data = await fetchShareData(token!);
      
      if (!data) {
        setError("Share not found");
        setLoading(false);
        return;
      }

      setShareData(data);
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

  if (error || !shareData) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-2 sm:p-4 max-w-7xl">
        <header className="mb-4 sm:mb-6">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 break-words">
            {shareData.project_name}
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Shared document • Read-only
          </p>
        </header>

        <div className="h-[calc(100vh-120px)] sm:h-[calc(100vh-180px)]">
          {/* Document Viewer */}
          <main className="w-full h-full">
            <div className="bg-white rounded-lg shadow-sm border h-full min-h-[400px] overflow-hidden">
              <DocumentViewer
                filePath={shareData.file_path}
                content={shareData.content}
              />
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

  return (
    <div className="h-full flex flex-col">
      {/* File header */}
      <div className="border-b p-2 sm:p-4 bg-gray-50 flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs sm:text-sm font-mono text-gray-600 truncate">{filePath}</h3>
          {!isMarkdown && (
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

