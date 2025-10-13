"use client";

import { useState, useEffect } from "react";
import { Badge, Skeleton } from "@uspark/ui";
import { Github, ExternalLink, Lock, Globe, AlertCircle } from "lucide-react";

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
    let isMounted = true;

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
        if (isMounted) {
          setRepositories(data.repositories || []);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : "Failed to load repositories",
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchRepositories();

    return () => {
      isMounted = false;
    };
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
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (repositories.length === 0) {
    return (
      <div className="rounded-lg border border-muted bg-muted/20 p-4">
        <div className="flex items-start gap-3">
          <Github className="mt-0.5 h-5 w-5 flex-shrink-0 text-muted-foreground" />
          <div className="flex-1 space-y-2">
            <p className="text-sm text-muted-foreground">
              No repositories found. Please connect your GitHub account and
              ensure the uSpark app has access to your repositories.
            </p>
            <a
              href="/settings/github"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Configure GitHub Settings
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
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
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-background">
                <Github className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{selectedRepo.fullName}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {selectedRepo.private ? (
                      <span className="flex items-center gap-1">
                        <Lock className="h-3 w-3" />
                        Private
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        Public
                      </span>
                    )}
                  </Badge>
                </div>
              </div>
            </div>
            <a
              href={selectedRepo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
