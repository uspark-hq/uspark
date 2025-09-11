"use client";

import { useState, useEffect } from "react";
// Simplified components for now - replace with proper UI library later
const Button = ({ children, onClick, disabled, variant, className }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 rounded ${variant === 'destructive' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'} ${disabled ? 'opacity-50' : ''} ${className || ''}`}
  >
    {children}
  </button>
);

const Card = ({ children }: any) => <div className="border rounded-lg shadow">{children}</div>;
const CardHeader = ({ children }: any) => <div className="p-4 border-b">{children}</div>;
const CardTitle = ({ children, className }: any) => <h3 className={`text-lg font-semibold ${className || ''}`}>{children}</h3>;
const CardDescription = ({ children }: any) => <p className="text-sm text-gray-600">{children}</p>;
const CardContent = ({ children, className }: any) => <div className={`p-4 ${className || ''}`}>{children}</div>;
const Alert = ({ children }: any) => <div className="p-3 border rounded bg-blue-50">{children}</div>;
const AlertDescription = ({ children }: any) => <div className="flex items-center gap-2">{children}</div>;

// Simple icon components
const Github = ({ className }: any) => <span className={className}>🔗</span>;
const Loader2 = ({ className }: any) => <span className={`${className} animate-spin`}>⏳</span>;
const Check = ({ className }: any) => <span className={className}>✓</span>;
const X = ({ className }: any) => <span className={className}>✕</span>;

interface GitHubStatus {
  connected: boolean;
  githubUsername?: string;
  connectedAt?: string;
  lastSyncedAt?: string;
}

export function GitHubConnection() {
  const [status, setStatus] = useState<GitHubStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch("/api/github/status");
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error("Failed to fetch GitHub status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    window.location.href = "/api/auth/github";
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect your GitHub account?")) {
      return;
    }

    setDisconnecting(true);
    try {
      const response = await fetch("/api/github/disconnect", {
        method: "POST",
      });

      if (response.ok) {
        setStatus({ connected: false });
      } else {
        alert("Failed to disconnect GitHub account");
      }
    } catch (error) {
      console.error("Failed to disconnect:", error);
      alert("Failed to disconnect GitHub account");
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Github className="h-5 w-5" />
          GitHub Integration
        </CardTitle>
        <CardDescription>
          Connect your GitHub account to sync documents with repositories
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status?.connected ? (
          <div className="space-y-4">
            <Alert>
              <Check className="h-4 w-4" />
              <AlertDescription>
                Connected as <strong>{status.githubUsername}</strong>
                {status.connectedAt && (
                  <span className="text-sm text-muted-foreground ml-2">
                    since {new Date(status.connectedAt).toLocaleDateString()}
                  </span>
                )}
              </AlertDescription>
            </Alert>

            {status.lastSyncedAt && (
              <p className="text-sm text-muted-foreground">
                Last synced: {new Date(status.lastSyncedAt).toLocaleString()}
              </p>
            )}

            <Button
              variant="destructive"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="w-full"
            >
              {disconnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                <>
                  <X className="mr-2 h-4 w-4" />
                  Disconnect GitHub
                </>
              )}
            </Button>
          </div>
        ) : (
          <Button onClick={handleConnect} className="w-full">
            <Github className="mr-2 h-4 w-4" />
            Connect GitHub Account
          </Button>
        )}
      </CardContent>
    </Card>
  );
}