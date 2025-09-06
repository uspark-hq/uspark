"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { getShares, deleteShare } from "./actions";

interface Share {
  id: string;
  token: string;
  projectId: string;
  filePath: string | null;
  url: string;
  createdAt: Date;
  accessedCount: number;
  lastAccessedAt: Date | null;
}

export default function SharesPage() {
  const [shares, setShares] = useState<Share[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      try {
        const data = await getShares();
        setShares(data);
      } catch (error) {
        console.error("Error fetching shares:", error);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const handleDelete = async (shareId: string) => {
    if (!confirm("Are you sure you want to revoke this share link?")) {
      return;
    }

    setDeletingId(shareId);
    try {
      await deleteShare(shareId);
      setShares((prev) => prev.filter((share) => share.id !== shareId));
    } catch (error) {
      console.error("Error deleting share:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      // You could add a toast notification here
    } catch (error) {
      console.error("Failed to copy link:", error);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
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
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "32px 24px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          marginBottom: "32px",
          borderBottom: "1px solid rgba(156, 163, 175, 0.2)",
          paddingBottom: "24px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "8px",
          }}
        >
          <h1
            style={{
              fontSize: "28px",
              fontWeight: "600",
              margin: 0,
              color: "var(--foreground)",
            }}
          >
            Shared Links
          </h1>
          <Link
            href="/settings"
            style={{
              padding: "8px 16px",
              fontSize: "14px",
              color: "rgba(156, 163, 175, 0.8)",
              textDecoration: "none",
              border: "1px solid rgba(156, 163, 175, 0.2)",
              borderRadius: "4px",
              backgroundColor: "transparent",
            }}
          >
            ← Back to Settings
          </Link>
        </div>
        <p
          style={{
            fontSize: "14px",
            color: "rgba(156, 163, 175, 0.8)",
            margin: 0,
          }}
        >
          Manage your shared file links. Revoke access at any time.
        </p>
      </div>

      {/* Content */}
      {loading ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "200px",
            color: "rgba(156, 163, 175, 0.6)",
          }}
        >
          Loading shares...
        </div>
      ) : shares.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "48px",
            backgroundColor: "rgba(156, 163, 175, 0.05)",
            borderRadius: "8px",
            border: "1px solid rgba(156, 163, 175, 0.1)",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔗</div>
          <h3
            style={{
              fontSize: "18px",
              fontWeight: "500",
              margin: "0 0 8px 0",
              color: "var(--foreground)",
            }}
          >
            No shared links yet
          </h3>
          <p
            style={{
              fontSize: "14px",
              color: "rgba(156, 163, 175, 0.6)",
              margin: 0,
            }}
          >
            Share files from your projects to create links that appear here.
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
                transition: "box-shadow 0.2s ease",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 4px 6px rgba(0, 0, 0, 0.05)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "start",
                  marginBottom: "12px",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: "500",
                      color: "var(--foreground)",
                      marginBottom: "4px",
                    }}
                  >
                    📄 {share.filePath || "Unknown file"}
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "rgba(156, 163, 175, 0.6)",
                    }}
                  >
                    Project: {share.projectId}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                  }}
                >
                  <button
                    onClick={() => handleCopyLink(share.url)}
                    style={{
                      padding: "6px 12px",
                      fontSize: "12px",
                      color: "#3b82f6",
                      backgroundColor: "transparent",
                      border: "1px solid #3b82f6",
                      borderRadius: "4px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = "#3b82f6";
                      e.currentTarget.style.color = "white";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = "#3b82f6";
                    }}
                  >
                    Copy Link
                  </button>
                  <button
                    onClick={() => handleDelete(share.id)}
                    disabled={deletingId === share.id}
                    style={{
                      padding: "6px 12px",
                      fontSize: "12px",
                      color: "#ef4444",
                      backgroundColor: "transparent",
                      border: "1px solid #ef4444",
                      borderRadius: "4px",
                      cursor:
                        deletingId === share.id ? "not-allowed" : "pointer",
                      opacity: deletingId === share.id ? 0.5 : 1,
                      transition: "all 0.2s ease",
                    }}
                    onMouseOver={(e) => {
                      if (deletingId !== share.id) {
                        e.currentTarget.style.backgroundColor = "#ef4444";
                        e.currentTarget.style.color = "white";
                      }
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = "#ef4444";
                    }}
                  >
                    {deletingId === share.id ? "Revoking..." : "Revoke"}
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "24px",
                  fontSize: "12px",
                  color: "rgba(156, 163, 175, 0.6)",
                  marginTop: "12px",
                  paddingTop: "12px",
                  borderTop: "1px solid rgba(156, 163, 175, 0.1)",
                }}
              >
                <span>Created: {formatDate(share.createdAt)}</span>
                <span>Accessed: {share.accessedCount} times</span>
                {share.lastAccessedAt && (
                  <span>Last accessed: {formatDate(share.lastAccessedAt)}</span>
                )}
              </div>

              <div
                style={{
                  marginTop: "12px",
                  padding: "8px 12px",
                  backgroundColor: "rgba(156, 163, 175, 0.05)",
                  borderRadius: "4px",
                  fontSize: "12px",
                  fontFamily: "monospace",
                  color: "rgba(156, 163, 175, 0.8)",
                  wordBreak: "break-all",
                }}
              >
                {share.url}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
