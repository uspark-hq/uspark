"use client";

import { useState } from "react";
import {
  type GenerateTokenResponse,
  type GenerateTokenError,
} from "@uspark/core";

export default function TokensPage() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [tokenName, setTokenName] = useState("");

  const generateToken = async () => {
    if (!tokenName.trim()) {
      setError("Token name is required");
      return;
    }

    setLoading(true);
    setError(null);
    setToken(null);

    try {
      const response = await fetch("/api/cli/auth/generate-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: tokenName,
          expires_in_days: 90,
        }),
      });

      if (response.ok) {
        const data: GenerateTokenResponse = await response.json();
        setToken(data.token);
        setTokenName("");
      } else {
        const errorData: GenerateTokenError = await response.json();
        setError(errorData.error_description);
      }
    } catch {
      setError("Failed to generate token. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (token) {
      try {
        await navigator.clipboard.writeText(token);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch {
        setError("Failed to copy token to clipboard");
      }
    }
  };

  return (
    <div style={{ 
      maxWidth: "800px", 
      margin: "0 auto", 
      padding: "20px",
      fontFamily: "var(--font-inter, -apple-system, BlinkMacSystemFont, sans-serif)"
    }}>
      <h1 style={{ 
        fontSize: "2rem", 
        marginBottom: "10px",
        color: "var(--foreground)"
      }}>
        CLI Tokens
      </h1>
      
      <p style={{ 
        marginBottom: "30px", 
        color: "#666",
        lineHeight: "1.5"
      }}>
        Generate tokens to authenticate with the uSpark CLI. Set the <code>USPARK_TOKEN</code> environment variable to use CLI commands.
      </p>

      <div style={{
        backgroundColor: "var(--background)",
        border: "1px solid #e5e5e5",
        borderRadius: "8px",
        padding: "24px",
        marginBottom: "20px"
      }}>
        <h2 style={{ 
          fontSize: "1.25rem", 
          marginBottom: "16px",
          color: "var(--foreground)"
        }}>
          Generate New Token
        </h2>

        <div style={{ marginBottom: "16px" }}>
          <label htmlFor="tokenName" style={{ 
            display: "block", 
            marginBottom: "8px",
            fontWeight: "500",
            color: "var(--foreground)"
          }}>
            Token Name
          </label>
          <input
            id="tokenName"
            type="text"
            value={tokenName}
            onChange={(e) => setTokenName(e.target.value)}
            placeholder="e.g., My Development Token"
            disabled={loading}
            style={{
              width: "100%",
              padding: "10px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              fontSize: "14px",
              backgroundColor: "var(--background)",
              color: "var(--foreground)"
            }}
          />
        </div>

        <button
          onClick={generateToken}
          disabled={loading || !tokenName.trim()}
          style={{
            backgroundColor: loading || !tokenName.trim() ? "#ccc" : "#0070f3",
            color: "white",
            border: "none",
            padding: "10px 20px",
            borderRadius: "4px",
            fontSize: "14px",
            cursor: loading || !tokenName.trim() ? "not-allowed" : "pointer",
            transition: "background-color 0.2s"
          }}
        >
          {loading ? "Generating..." : "Generate Token"}
        </button>

        {error && (
          <div style={{
            backgroundColor: "#fee",
            border: "1px solid #fcc",
            borderRadius: "4px",
            padding: "12px",
            marginTop: "16px",
            color: "#c00"
          }}>
            {error}
          </div>
        )}
      </div>

      {token && (
        <div style={{
          backgroundColor: "var(--background)",
          border: "1px solid #e5e5e5",
          borderRadius: "8px",
          padding: "24px"
        }}>
          <h2 style={{ 
            fontSize: "1.25rem", 
            marginBottom: "16px",
            color: "var(--foreground)"
          }}>
            Your New Token
          </h2>
          
          <div style={{
            backgroundColor: "#f9f9f9",
            border: "1px solid #e1e1e1",
            borderRadius: "4px",
            padding: "12px",
            fontFamily: "monospace",
            fontSize: "13px",
            marginBottom: "12px",
            wordBreak: "break-all",
            color: "#333"
          }}>
            {token}
          </div>

          <button
            onClick={copyToClipboard}
            style={{
              backgroundColor: copySuccess ? "#28a745" : "#6c757d",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "4px",
              fontSize: "14px",
              cursor: "pointer",
              marginRight: "12px",
              transition: "background-color 0.2s"
            }}
          >
            {copySuccess ? "✓ Copied!" : "Copy Token"}
          </button>

          <div style={{
            backgroundColor: "#fff3cd",
            border: "1px solid #ffeaa7",
            borderRadius: "4px",
            padding: "12px",
            marginTop: "16px",
            color: "#856404"
          }}>
            <strong>Important:</strong> This token will only be shown once. Make sure to copy it now and store it securely. You can use it by setting the <code>USPARK_TOKEN</code> environment variable.
          </div>
        </div>
      )}
    </div>
  );
}