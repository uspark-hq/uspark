"use client";

import { useState, useActionState } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@uspark/ui";
import { type GenerateTokenResult } from "./actions";

interface TokenFormProps {
  action: (formData: FormData) => Promise<GenerateTokenResult>;
}

export function TokenForm({ action }: TokenFormProps) {
  const [result, formAction, isPending] = useActionState(
    async (previousState: GenerateTokenResult | null, formData: FormData) => {
      return action(formData);
    },
    null,
  );
  const [copySuccess, setCopySuccess] = useState(false);

  const copyToClipboard = async (token: string) => {
    await navigator.clipboard.writeText(token);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const token = result?.success ? result.data.token : null;
  const error =
    result?.success === false ? result.error.error_description : null;

  return (
    <>
      <form action={formAction}>
        <Card className="mb-5">
          <CardHeader>
            <CardTitle>Generate New Token</CardTitle>
          </CardHeader>
          <CardContent>

          <div style={{ marginBottom: "16px" }}>
            <label
              htmlFor="name"
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "500",
                color: "var(--foreground)",
              }}
            >
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
                color: "var(--foreground)",
              }}
            />
          </div>

          <input name="expires_in_days" type="hidden" value="90" />

          <Button type="submit" disabled={isPending}>
            {isPending ? "Generating..." : "Generate Token"}
          </Button>

          {error && (
            <div
              style={{
                backgroundColor: "#fee",
                border: "1px solid #fcc",
                borderRadius: "4px",
                padding: "12px",
                marginTop: "16px",
                color: "#c00",
              }}
            >
              {error}
            </div>
          )}
          </CardContent>
        </Card>
      </form>

      {token && (
        <Card>
          <CardHeader>
            <CardTitle>Your New Token</CardTitle>
          </CardHeader>
          <CardContent>

          <div
            style={{
              backgroundColor: "#f9f9f9",
              border: "1px solid #e1e1e1",
              borderRadius: "4px",
              padding: "12px",
              fontFamily: "monospace",
              fontSize: "13px",
              marginBottom: "12px",
              wordBreak: "break-all",
              color: "#333",
            }}
          >
            {token}
          </div>

          <Button
            onClick={() => copyToClipboard(token)}
            variant={copySuccess ? "default" : "secondary"}
            className="mr-3"
          >
            {copySuccess ? "✓ Copied!" : "Copy Token"}
          </Button>

          <div
            style={{
              backgroundColor: "#fff3cd",
              border: "1px solid #ffeaa7",
              borderRadius: "4px",
              padding: "12px",
              marginTop: "16px",
              color: "#856404",
            }}
          >
            <strong>Important:</strong> This token will only be shown once. Make
            sure to copy it now and store it securely. You can use it by setting
            the <code>USPARK_TOKEN</code> environment variable.
          </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
