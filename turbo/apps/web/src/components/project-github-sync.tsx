"use client";

import { useState, useEffect } from "react";
// Simplified components for now - replace with proper UI library later
const Button = ({ children, onClick, disabled, className }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 rounded bg-blue-500 text-white ${disabled ? 'opacity-50' : ''} ${className || ''}`}
  >
    {children}
  </button>
);

const Card = ({ children }: any) => <div className="border rounded-lg shadow">{children}</div>;
const CardHeader = ({ children }: any) => <div className="p-4 border-b">{children}</div>;
const CardTitle = ({ children, className }: any) => <h3 className={`text-lg font-semibold ${className || ''}`}>{children}</h3>;
const CardDescription = ({ children }: any) => <p className="text-sm text-gray-600">{children}</p>;
const CardContent = ({ children }: any) => <div className="p-4">{children}</div>;
const Alert = ({ children }: any) => <div className="p-3 border rounded bg-blue-50">{children}</div>;
const AlertDescription = ({ children, className }: any) => <div className={`flex items-center gap-2 ${className || ''}`}>{children}</div>;
const Input = ({ id, value, onChange, placeholder, disabled }: any) => (
  <input
    id={id}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    disabled={disabled}
    className="w-full px-3 py-2 border rounded"
  />
);
const Label = ({ htmlFor, children }: any) => (
  <label htmlFor={htmlFor} className="block text-sm font-medium">{children}</label>
);

// Simple icon components
const Github = ({ className }: any) => <span className={className}>🔗</span>;
const GitBranch = ({ className }: any) => <span className={className}>🌳</span>;
const Loader2 = ({ className }: any) => <span className={`${className} animate-spin`}>⏳</span>;
const ExternalLink = ({ className }: any) => <span className={className}>↗</span>;
const RefreshCw = ({ className }: any) => <span className={className}>🔄</span>;

interface ProjectGitHubSyncProps {
  projectId: string;
  projectName: string;
}

interface RepoStatus {
  connected: boolean;
  syncing: boolean;
  repository?: string;
  lastSync?: {
    direction: string;
    status: string;
    createdAt: string;
  };
}

export function ProjectGitHubSync({ projectId, projectName }: ProjectGitHubSyncProps) {
  const [repoStatus, setRepoStatus] = useState<RepoStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [repoName, setRepoName] = useState(`${projectName}-docs`);

  useEffect(() => {
    fetchRepoStatus();
  }, [projectId]);

  const fetchRepoStatus = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/github/status`);
      const data = await response.json();
      setRepoStatus(data);
    } catch (error) {
      console.error("Failed to fetch repo status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRepo = async () => {
    setCreating(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/github/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ repoName }),
      });

      if (response.ok) {
        const data = await response.json();
        await fetchRepoStatus();
        window.open(data.repoUrl, "_blank");
      } else {
        const error = await response.json();
        alert(error.message || "Failed to create repository");
      }
    } catch (error) {
      console.error("Failed to create repo:", error);
      alert("Failed to create repository");
    } finally {
      setCreating(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/github/sync`, {
        method: "POST",
      });

      if (response.ok) {
        await fetchRepoStatus();
      } else {
        const error = await response.json();
        alert(error.message || "Sync failed");
      }
    } catch (error) {
      console.error("Sync failed:", error);
      alert("Sync failed");
    } finally {
      setSyncing(false);
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
          <GitBranch className="h-5 w-5" />
          GitHub Repository
        </CardTitle>
        <CardDescription>
          Sync your project documents with a GitHub repository
        </CardDescription>
      </CardHeader>
      <CardContent>
        {repoStatus?.connected ? (
          <div className="space-y-4">
            <Alert>
              <Github className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>
                  Connected to <strong>{repoStatus.repository}</strong>
                </span>
                <a
                  href={`https://github.com/${repoStatus.repository}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm underline"
                >
                  View on GitHub
                  <ExternalLink className="h-3 w-3" />
                </a>
              </AlertDescription>
            </Alert>

            {repoStatus.lastSync && (
              <div className="text-sm text-muted-foreground">
                <p>
                  Last sync: {new Date(repoStatus.lastSync.createdAt).toLocaleString()}
                </p>
                <p>
                  Direction: {repoStatus.lastSync.direction === "push" ? "→ GitHub" : "← GitHub"}
                </p>
                <p>Status: {repoStatus.lastSync.status}</p>
              </div>
            )}

            <Button
              onClick={handleSync}
              disabled={syncing || repoStatus.syncing}
              className="w-full"
            >
              {syncing || repoStatus.syncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync Now
                </>
              )}
            </Button>

            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-2">Clone Repository</h4>
              <code className="block p-2 bg-muted rounded text-xs">
                git clone https://github.com/{repoStatus.repository}.git
              </code>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                No repository connected. Create one to enable GitHub sync.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="repo-name">Repository Name</Label>
              <Input
                id="repo-name"
                value={repoName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRepoName(e.target.value)}
                placeholder="my-project-docs"
                disabled={creating}
              />
              <p className="text-xs text-muted-foreground">
                This will create a new repository in your GitHub account
              </p>
            </div>

            <Button
              onClick={handleCreateRepo}
              disabled={creating || !repoName}
              className="w-full"
            >
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Repository...
                </>
              ) : (
                <>
                  <Github className="mr-2 h-4 w-4" />
                  Create GitHub Repository
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}