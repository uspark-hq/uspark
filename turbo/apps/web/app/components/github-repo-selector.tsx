"use client";

import { useState, useEffect } from "react";
import {
  Badge,
  Button,
  Skeleton,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@uspark/ui";
import {
  Github,
  ExternalLink,
  Lock,
  Globe,
  AlertCircle,
  Check,
  ChevronsUpDown,
} from "lucide-react";

interface Repository {
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
  const [open, setOpen] = useState(false);

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
      setOpen(false); // Close popover after selection
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          data-testid="repository-selector"
        >
          {selectedRepo ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Github className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{selectedRepo.fullName}</span>
              <Badge variant="secondary" className="text-xs flex-shrink-0">
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
              {selectedRepo.url && (
                <a
                  href={selectedRepo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">
              Select a repository...
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Search repositories..." />
          <CommandList>
            <CommandEmpty>No repositories found.</CommandEmpty>
            {Object.entries(groupedRepos).map(([owner, repos]) => (
              <CommandGroup key={owner} heading={owner}>
                {repos.map((repo) => (
                  <CommandItem
                    key={repo.id}
                    value={repo.fullName}
                    onSelect={() => handleRepoChange(repo.fullName)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <Github className="h-4 w-4" />
                      <span>{repo.name}</span>
                      {repo.private ? (
                        <Lock className="h-3 w-3 text-muted-foreground" />
                      ) : (
                        <Globe className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                    {selectedRepo?.fullName === repo.fullName && (
                      <Check className="h-4 w-4" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
