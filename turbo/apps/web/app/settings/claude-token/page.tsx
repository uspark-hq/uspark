"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Navigation } from "../../components/navigation";

interface TokenData {
  userId: string;
  tokenPrefix: string;
  lastUsedAt?: string;
  lastErrorAt?: string;
  lastErrorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export default function ClaudeTokenPage() {
  const [token, setToken] = useState<TokenData | null>(null);
  const [newToken, setNewToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const fetchToken = useCallback(async () => {
    try {
      const response = await fetch("/api/claude-token");
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/sign-in");
          return;
        }
        throw new Error("Failed to fetch token");
      }
      const data = await response.json();
      setToken(data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load token");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  const handleSaveToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const response = await fetch("/api/claude-token", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: newToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error_description || data.error || "Failed to save token",
        );
      }

      setToken(data.token);
      setNewToken("");
      setSuccess("Claude OAuth token saved successfully!");
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save token");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteToken = async () => {
    if (!confirm("Are you sure you want to delete your Claude OAuth token?")) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/claude-token", {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(
          data.error_description || data.error || "Failed to delete token",
        );
      }

      setToken(null);
      setNewToken("");
      setSuccess("Claude OAuth token deleted successfully!");
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete token");
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <div style={{ padding: "20px", textAlign: "center" }}>Loading...</div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          padding: "20px",
          fontFamily:
            "var(--font-inter, -apple-system, BlinkMacSystemFont, sans-serif)",
        }}
      >
        <h1
          style={{
            fontSize: "2rem",
            marginBottom: "10px",
            color: "var(--foreground)",
          }}
        >
          Claude OAuth Token
        </h1>
        <p style={{ color: "#666", marginBottom: "30px" }}>
          Configure your Claude OAuth token for E2B execution. Generate a token
          using <code>claude setup-token</code> in your terminal (requires
          Claude Pro/Max).
        </p>

        {error && (
          <div
            style={{
              padding: "12px",
              marginBottom: "20px",
              backgroundColor: "#fee",
              border: "1px solid #fcc",
              borderRadius: "4px",
              color: "#c00",
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            style={{
              padding: "12px",
              marginBottom: "20px",
              backgroundColor: "#efe",
              border: "1px solid #cfc",
              borderRadius: "4px",
              color: "#060",
            }}
          >
            {success}
          </div>
        )}

        {token ? (
          <div
            style={{
              padding: "20px",
              border: "1px solid #e1e4e8",
              borderRadius: "8px",
              marginBottom: "20px",
            }}
          >
            <h2
              style={{
                fontSize: "1.25rem",
                marginBottom: "16px",
                color: "var(--foreground)",
              }}
            >
              Current Token
            </h2>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <div>
                <strong>Token:</strong>{" "}
                <code
                  style={{
                    padding: "2px 6px",
                    backgroundColor: "#f6f8fa",
                    borderRadius: "3px",
                  }}
                >
                  {token.tokenPrefix}
                </code>
              </div>
              <div>
                <strong>Created:</strong> {formatDate(token.createdAt)}
              </div>
              <div>
                <strong>Updated:</strong> {formatDate(token.updatedAt)}
              </div>
              <div>
                <strong>Last Used:</strong> {formatDate(token.lastUsedAt)}
              </div>
              {token.lastErrorAt && (
                <div>
                  <strong>Last Error:</strong>{" "}
                  <span style={{ color: "#c00" }}>
                    {formatDate(token.lastErrorAt)}
                    {token.lastErrorMessage && ` - ${token.lastErrorMessage}`}
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={handleDeleteToken}
              style={{
                marginTop: "20px",
                padding: "10px 20px",
                backgroundColor: "#dc3545",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "14px",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.backgroundColor = "#c82333")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.backgroundColor = "#dc3545")
              }
            >
              Delete Token
            </button>
          </div>
        ) : (
          <div
            style={{
              padding: "20px",
              border: "1px solid #e1e4e8",
              borderRadius: "8px",
              backgroundColor: "#f6f8fa",
              textAlign: "center",
              color: "#666",
            }}
          >
            No Claude OAuth token configured
          </div>
        )}

        <form
          onSubmit={handleSaveToken}
          style={{
            padding: "20px",
            border: "1px solid #e1e4e8",
            borderRadius: "8px",
          }}
        >
          <h2
            style={{
              fontSize: "1.25rem",
              marginBottom: "16px",
              color: "var(--foreground)",
            }}
          >
            {token ? "Update Token" : "Add Token"}
          </h2>
          <div style={{ marginBottom: "16px" }}>
            <label
              htmlFor="token"
              style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}
            >
              OAuth Token
            </label>
            <input
              id="token"
              type="password"
              value={newToken}
              onChange={(e) => setNewToken(e.target.value)}
              placeholder="Enter your Claude OAuth token"
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "4px",
                fontSize: "14px",
                fontFamily: "monospace",
              }}
              required
              minLength={30}
            />
            <small
              style={{ color: "#666", marginTop: "4px", display: "block" }}
            >
              Generate this token by running{" "}
              <code
                style={{
                  padding: "2px 4px",
                  backgroundColor: "#f6f8fa",
                  borderRadius: "3px",
                }}
              >
                claude setup-token
              </code>{" "}
              in your terminal
            </small>
          </div>
          <button
            type="submit"
            disabled={saving || !newToken}
            style={{
              padding: "10px 20px",
              backgroundColor: saving || !newToken ? "#ccc" : "#0366d6",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: saving || !newToken ? "not-allowed" : "pointer",
              fontSize: "14px",
            }}
          >
            {saving ? "Saving..." : token ? "Update Token" : "Save Token"}
          </button>
        </form>
      </div>
    </>
  );
}
