"use client";

import { useState, useEffect } from "react";

interface GitHubSyncButtonProps {
  projectId: string;
}

export function GitHubSyncButton({ projectId }: GitHubSyncButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  // Clear success message after 5 seconds with proper cleanup
  useEffect(() => {
    if (syncStatus.type === "success") {
      const timeoutId = setTimeout(() => {
        setSyncStatus({ type: null, message: "" });
      }, 5000);

      return () => clearTimeout(timeoutId);
    }
  }, [syncStatus.type]);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncStatus({ type: null, message: "" });

    try {
      const response = await fetch(`/api/projects/${projectId}/github/sync`, {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        setSyncStatus({
          type: "success",
          message: `Successfully synced ${data.filesCount} files to GitHub`,
        });
      } else {
        let errorMessage = "Sync failed";

        if (data.error === "repository_not_linked") {
          errorMessage =
            "No GitHub repository linked. Please link a repository first.";
        } else if (data.error === "unauthorized") {
          errorMessage = "You are not authorized to sync this project.";
        } else if (data.message) {
          errorMessage = data.message;
        }

        setSyncStatus({
          type: "error",
          message: errorMessage,
        });
      }
    } catch {
      setSyncStatus({
        type: "error",
        message: "Network error. Please try again.",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <button
        onClick={handleSync}
        disabled={isSyncing}
        style={{
          padding: "8px 16px",
          fontSize: "14px",
          color: isSyncing ? "rgba(156, 163, 175, 0.5)" : "#fff",
          backgroundColor: isSyncing ? "rgba(156, 163, 175, 0.2)" : "#0969da",
          border: "1px solid rgba(156, 163, 175, 0.2)",
          borderRadius: "4px",
          cursor: isSyncing ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        {isSyncing ? (
          <>
            <span
              style={{
                display: "inline-block",
                width: "14px",
                height: "14px",
                border: "2px solid rgba(156, 163, 175, 0.3)",
                borderTopColor: "#0969da",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
            Syncing...
          </>
        ) : (
          <>
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="currentColor"
              style={{ display: "block" }}
            >
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            Sync to GitHub
          </>
        )}
      </button>

      {syncStatus.type && (
        <div
          style={{
            padding: "8px 12px",
            fontSize: "13px",
            borderRadius: "4px",
            backgroundColor:
              syncStatus.type === "success"
                ? "rgba(46, 160, 67, 0.1)"
                : "rgba(218, 54, 51, 0.1)",
            color: syncStatus.type === "success" ? "#2ea043" : "#da3633",
            border: `1px solid ${
              syncStatus.type === "success"
                ? "rgba(46, 160, 67, 0.3)"
                : "rgba(218, 54, 51, 0.3)"
            }`,
          }}
        >
          {syncStatus.message}
        </div>
      )}

      <style>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
