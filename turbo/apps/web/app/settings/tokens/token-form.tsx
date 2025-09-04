"use client";

import { useState, useActionState } from "react";
import { type GenerateTokenResult } from "./actions";

interface TokenFormProps {
  action: (formData: FormData) => Promise<GenerateTokenResult>;
}

export function TokenForm({ action }: TokenFormProps) {
  const [result, formAction, isPending] = useActionState(action, null);
  const [copySuccess, setCopySuccess] = useState(false);

  const copyToClipboard = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      console.error("Failed to copy token to clipboard");
    }
  };

  const token = result?.success ? result.data.token : null;
  const error = result?.success === false ? result.error.error_description : null;

  return (
    <>
      <form action={formAction}>
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
            <label htmlFor="name" style={{ 
              display: "block", 
              marginBottom: "8px",
              fontWeight: "500",
              color: "var(--foreground)"
            }}>
              Token Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="e.g., My Development Token"
              disabled={isPending}
              required
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

          <input name="expires_in_days" type="hidden" value="90" />

          <button
            type="submit"
            disabled={isPending}
            style={{
              backgroundColor: isPending ? "#ccc" : "#0070f3",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "4px",
              fontSize: "14px",
              cursor: isPending ? "not-allowed" : "pointer",
              transition: "background-color 0.2s"
            }}
          >
            {isPending ? "Generating..." : "Generate Token"}
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
      </form>

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
            onClick={() => copyToClipboard(token)}
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
    </>
  );
}