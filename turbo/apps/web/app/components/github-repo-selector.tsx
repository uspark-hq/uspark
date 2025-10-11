"use client";

import { useState, useEffect } from "react";

export interface Repository {
  id: number;
  name: string;
  fullName: string;
  installationId: number;
  private: boolean;
  url: string;
}

interface GitHubRepoSelectorProps {
  onSelect: (repo: Repository | null, installationId: number | null) => void;
  value?: { repoUrl: string; installationId: number } | null;
}

export function GitHubRepoSelector({
  onSelect,
  value,
}: GitHubRepoSelectorProps) {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);

  useEffect(() => {
    fetchRepositories();
  }, []);

  useEffect(() => {
    // Set initial value if provided
    if (value && repositories.length > 0) {
      const repo = repositories.find(
        (r) =>
          r.fullName === value.repoUrl &&
          r.installationId === value.installationId,
      );
      if (repo) {
        setSelectedRepo(repo);
      }
    }
  }, [value, repositories]);

  const fetchRepositories = async () => {
    try {
      const response = await fetch("/api/github/repositories");
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Please sign in to access GitHub repositories");
        }
        throw new Error("Failed to fetch repositories");
      }
      const data = await response.json();
      setRepositories(data.repositories || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load repositories",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRepoChange = (repoFullName: string) => {
    if (!repoFullName) {
      setSelectedRepo(null);
      onSelect(null, null);
      return;
    }

    const repo = repositories.find((r) => r.fullName === repoFullName);
    if (repo) {
      setSelectedRepo(repo);
      onSelect(repo, repo.installationId);
    }
  };

  // Group repositories by account (owner)
  const groupedRepos = repositories.reduce(
    (acc, repo) => {
      const owner = repo.fullName.split("/")[0] || "Unknown";
      if (!acc[owner]) {
        acc[owner] = [];
      }
      acc[owner].push(repo);
      return acc;
    },
    {} as Record<string, Repository[]>,
  );

  if (loading) {
    return (
      <div className="rounded-md border border-input bg-background px-3 py-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-primary" />
          <span>Loading repositories...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive bg-destructive/10 px-3 py-2">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (repositories.length === 0) {
    return (
      <div className="rounded-md border border-input bg-background px-3 py-2">
        <p className="text-sm text-muted-foreground mb-2">
          No repositories found. Please connect your GitHub account and ensure
          the uSpark app has access to your repositories.
        </p>
        <a
          href="/settings/github"
          className="text-sm text-primary hover:underline"
        >
          Configure GitHub Settings →
        </a>
      </div>
    );
  }

  return (
    <div>
      <select
        value={selectedRepo?.fullName || ""}
        onChange={(e) => handleRepoChange(e.target.value)}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="">Select a repository (optional)</option>
        {Object.entries(groupedRepos).map(([owner, repos]) => (
          <optgroup key={owner} label={owner}>
            {repos.map((repo) => (
              <option key={repo.id} value={repo.fullName}>
                {repo.name}
                {repo.private ? " 🔒" : ""}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {selectedRepo && (
        <p className="mt-2 text-xs text-muted-foreground">
          {selectedRepo.private ? "🔒 Private" : "🌐 Public"} repository •{" "}
          <a
            href={selectedRepo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            View on GitHub →
          </a>
        </p>
      )}
    </div>
  );
}
