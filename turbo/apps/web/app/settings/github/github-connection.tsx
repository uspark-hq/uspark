"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Installation {
  installationId: number;
  accountName: string;
  accountType: string;
  createdAt: string;
  repositorySelection: string;
}

export function GitHubConnection() {
  const router = useRouter();
  const [installation, setInstallation] = useState<Installation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInstallationStatus();
  }, []);

  const fetchInstallationStatus = async () => {
    try {
      const response = await fetch("/api/github/installation-status");
      if (response.ok) {
        const data = await response.json();
        if (data.installation) {
          setInstallation(data.installation);
        }
      } else if (response.status !== 404) {
        setError("Failed to fetch installation status");
      }
    } catch (err) {
      setError("Network error");
      console.error("Error fetching installation status:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    // Redirect to GitHub App installation
    window.location.href = "/api/github/install";
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect your GitHub account?")) {
      return;
    }

    try {
      const response = await fetch("/api/github/disconnect", {
        method: "POST",
      });

      if (response.ok) {
        setInstallation(null);
        router.refresh();
      } else {
        setError("Failed to disconnect GitHub account");
      }
    } catch (err) {
      setError("Network error");
      console.error("Error disconnecting:", err);
    }
  };

  const handleManageOnGitHub = () => {
    if (installation) {
      // Use the GitHub Apps page with the app slug
      window.open(
        `https://github.com/apps/uspark-sync`,
        "_blank",
      );
    }
  };

  if (loading) {
    return (
      <div
        style={{
          padding: "20px",
          border: "1px solid #e1e4e8",
          borderRadius: "8px",
          backgroundColor: "#f6f8fa",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span
            style={{
              display: "inline-block",
              width: "20px",
              height: "20px",
              border: "2px solid #e1e4e8",
              borderTopColor: "#0969da",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
          <span style={{ color: "#666" }}>Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: "20px",
          border: "1px solid #da3633",
          borderRadius: "8px",
          backgroundColor: "rgba(218, 54, 51, 0.05)",
          color: "#da3633",
        }}
      >
        {error}
      </div>
    );
  }

  if (!installation) {
    return (
      <div
        style={{
          padding: "20px",
          border: "1px solid #e1e4e8",
          borderRadius: "8px",
          backgroundColor: "#f6f8fa",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
          }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 16 16"
            fill="#24292e"
            style={{ flexShrink: 0 }}
          >
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          <div style={{ flex: 1 }}>
            <h3
              style={{
                margin: "0 0 8px 0",
                fontSize: "1.1rem",
                color: "var(--foreground)",
              }}
            >
              Connect GitHub Account
            </h3>
            <p style={{ margin: "0 0 16px 0", color: "#666", lineHeight: 1.5 }}>
              Install the uSpark GitHub App to sync your projects with GitHub
              repositories. You can choose which repositories to grant access
              to.
            </p>
            <button
              onClick={handleConnect}
              style={{
                padding: "8px 16px",
                fontSize: "14px",
                color: "#fff",
                backgroundColor: "#0969da",
                border: "1px solid #0969da",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              Connect GitHub
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "20px",
        border: "1px solid #2ea043",
        borderRadius: "8px",
        backgroundColor: "rgba(46, 160, 67, 0.05)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "20px",
        }}
      >
        <svg
          width="48"
          height="48"
          viewBox="0 0 16 16"
          fill="#2ea043"
          style={{ flexShrink: 0 }}
        >
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "8px",
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: "1.1rem",
                color: "var(--foreground)",
              }}
            >
              Connected to GitHub
            </h3>
            <span
              style={{
                padding: "4px 8px",
                fontSize: "12px",
                color: "#2ea043",
                backgroundColor: "rgba(46, 160, 67, 0.1)",
                border: "1px solid rgba(46, 160, 67, 0.3)",
                borderRadius: "12px",
                fontWeight: 500,
              }}
            >
              Active
            </span>
          </div>
          <div style={{ marginBottom: "16px" }}>
            <p style={{ margin: "0 0 4px 0", color: "#666" }}>
              <strong>Account:</strong> {installation.accountName} (
              {installation.accountType})
            </p>
            <p style={{ margin: "0 0 4px 0", color: "#666" }}>
              <strong>Repository Access:</strong>{" "}
              {installation.repositorySelection}
            </p>
            <p style={{ margin: 0, color: "#666" }}>
              <strong>Connected:</strong>{" "}
              {new Date(installation.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={handleManageOnGitHub}
              style={{
                padding: "8px 16px",
                fontSize: "14px",
                color: "#0969da",
                backgroundColor: "#fff",
                border: "1px solid #d1d5da",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              Manage on GitHub
            </button>
            <button
              onClick={handleDisconnect}
              style={{
                padding: "8px 16px",
                fontSize: "14px",
                color: "#da3633",
                backgroundColor: "#fff",
                border: "1px solid #da3633",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              Disconnect
            </button>
          </div>
        </div>
      </div>

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
