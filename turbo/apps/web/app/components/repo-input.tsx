"use client";

import { useState } from "react";
import { Input } from "@uspark/ui";

interface RepoVerificationResult {
  type: "installed" | "public";
  fullName: string;
  repoName: string;
  installationId?: number;
}

interface RepoInputProps {
  onRepoVerified: (result: RepoVerificationResult) => void;
}

export function RepoInput({ onRepoVerified }: RepoInputProps) {
  const [input, setInput] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    setVerified(false);
    setError(null);
  };

  const handleVerify = async () => {
    if (!input.trim()) return;

    setVerifying(true);
    setError(null);

    try {
      const response = await fetch("/api/github/verify-repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: input.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error_description || "Failed to verify repository");
        setVerified(false);
        return;
      }

      const data = await response.json();
      if (data.valid) {
        setVerified(true);
        setError(null);
        onRepoVerified({
          type: data.type,
          fullName: data.fullName,
          repoName: data.repoName,
          installationId: data.installationId,
        });
      }
    } catch {
      setError("Failed to verify repository");
      setVerified(false);
    } finally {
      setVerifying(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleVerify();
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Input
          placeholder="Enter GitHub URL or owner/repo (e.g., facebook/react)"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleVerify}
          disabled={verifying}
          className={
            verified ? "border-green-500 pr-10" : error ? "border-red-500" : ""
          }
        />
        {verifying && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
        {verified && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
            ✓
          </div>
        )}
      </div>

      {error && <div className="text-sm text-red-500">{error}</div>}

      {verified && (
        <div className="text-sm text-green-600">
          Repository found and verified
        </div>
      )}
    </div>
  );
}
