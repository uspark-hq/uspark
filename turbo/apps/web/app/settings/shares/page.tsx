"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Share {
  id: string;
  url: string;
  token: string;
  project_id: string;
  file_path: string | null;
  created_at: string;
  accessed_count: number;
  last_accessed_at: string | null;
}

export default function SharesManagementPage() {
  const router = useRouter();
  const [shares, setShares] = useState<Share[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadShares();
  }, []);

  const loadShares = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/shares");
      if (response.ok) {
        const data = await response.json();
        setShares(data.shares);
      } else {
        console.error("Failed to load shares");
      }
    } catch (error) {
      console.error("Error loading shares:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (shareId: string) => {
    setDeletingId(shareId);
    try {
      const response = await fetch(`/api/shares/${shareId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setShares((prevShares) => prevShares.filter((s) => s.id !== shareId));
      } else {
        console.error("Failed to delete share");
      }
    } catch (error) {
      console.error("Error deleting share:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyUrl = (share: Share) => {
    navigator.clipboard.writeText(share.url);
    setCopiedId(share.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--background)",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: "24px 32px",
          borderBottom: "1px solid rgba(156, 163, 175, 0.2)",
          backgroundColor: "var(--background)",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "24px",
                fontWeight: "600",
                margin: 0,
                color: "var(--foreground)",
              }}
            >
              Shared Links
            </h1>
            <p
              style={{
                fontSize: "14px",
                color: "rgba(156, 163, 175, 0.8)",
                margin: "4px 0 0 0",
              }}
            >
              Manage your shared file links
            </p>
          </div>
          <button
            onClick={() => router.push("/projects")}
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
        </div>
      </header>

      {/* Content */}
      <main
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "32px",
        }}
      >
        {loading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "200px",
              color: "rgba(156, 163, 175, 0.6)",
            }}
          >
            Loading shares...
          </div>
        ) : shares.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              color: "rgba(156, 163, 175, 0.6)",
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔗</div>
            <h2
              style={{
                fontSize: "18px",
                fontWeight: "500",
                marginBottom: "8px",
                color: "var(--foreground)",
              }}
            >
              No shared links yet
            </h2>
            <p style={{ fontSize: "14px" }}>
              Share files from your projects to create links here
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "16px",
            }}
          >
            {shares.map((share) => (
              <div
                key={share.id}
                style={{
                  backgroundColor: "var(--background)",
                  border: "1px solid rgba(156, 163, 175, 0.2)",
                  borderRadius: "8px",
                  padding: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "20px",
                }}
              >
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
                        fontSize: "16px",
                        fontWeight: "500",
                        margin: 0,
                        color: "var(--foreground)",
                      }}
                    >
                      {share.file_path || "Entire Project"}
                    </h3>
                    <span
                      style={{
                        fontSize: "12px",
                        padding: "2px 8px",
                        backgroundColor: "rgba(59, 130, 246, 0.1)",
                        color: "#3b82f6",
                        borderRadius: "4px",
                      }}
                    >
                      Project: {share.project_id}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "24px",
                      fontSize: "13px",
                      color: "rgba(156, 163, 175, 0.8)",
                    }}
                  >
                    <span>Created: {formatDate(share.created_at)}</span>
                    <span>Views: {share.accessed_count}</span>
                    {share.last_accessed_at && (
                      <span>
                        Last accessed: {formatDate(share.last_accessed_at)}
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      marginTop: "12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <input
                      type="text"
                      value={share.url}
                      readOnly
                      style={{
                        flex: 1,
                        maxWidth: "400px",
                        padding: "6px 10px",
                        fontSize: "12px",
                        fontFamily: "Monaco, Consolas, monospace",
                        backgroundColor: "rgba(156, 163, 175, 0.05)",
                        border: "1px solid rgba(156, 163, 175, 0.2)",
                        borderRadius: "4px",
                        color: "var(--foreground)",
                        cursor: "text",
                      }}
                      onClick={(e) => e.currentTarget.select()}
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                  }}
                >
                  <button
                    onClick={() => handleCopyUrl(share)}
                    style={{
                      padding: "6px 12px",
                      fontSize: "13px",
                      color: copiedId === share.id ? "#10b981" : "#3b82f6",
                      backgroundColor: "transparent",
                      border: `1px solid ${copiedId === share.id ? "#10b981" : "#3b82f6"}`,
                      borderRadius: "4px",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {copiedId === share.id ? "✓ Copied" : "Copy Link"}
                  </button>
                  <button
                    onClick={() => handleDelete(share.id)}
                    disabled={deletingId === share.id}
                    style={{
                      padding: "6px 12px",
                      fontSize: "13px",
                      color:
                        deletingId === share.id
                          ? "rgba(156, 163, 175, 0.4)"
                          : "#ef4444",
                      backgroundColor: "transparent",
                      border: `1px solid ${
                        deletingId === share.id
                          ? "rgba(156, 163, 175, 0.2)"
                          : "#ef4444"
                      }`,
                      borderRadius: "4px",
                      cursor:
                        deletingId === share.id ? "not-allowed" : "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {deletingId === share.id ? "Deleting..." : "Revoke"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

