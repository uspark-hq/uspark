"use client";

/**
 * Projects List Page
 *
 * Note: This page previously had a polling mechanism that refreshed every 3 seconds.
 * This was removed to improve performance and reduce unnecessary network requests.
 */

import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from "@uspark/ui";
import { Trash2, FolderOpen, Plus, Star } from "lucide-react";

import type { Project } from "@uspark/core";
import { type ListProjectsResponse } from "@uspark/core/contracts/projects.contract";
import { type InstallationStatusResponse } from "@uspark/core/contracts/github.contract";
import { Navigation } from "../components/navigation";

export default function ProjectsListPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [checkingGitHub, setCheckingGitHub] = useState(true);
  const [hasGitHubInstallation, setHasGitHubInstallation] = useState<
    boolean | null
  >(null);
  // Store star counts separately, keyed by repo URL
  const [starCounts, setStarCounts] = useState<Record<string, number>>({});

  // Navigate to project - check if init is completed
  const navigateToProject = async (project: Project) => {
    const currentUrl = new URL(window.location.href);

    // If project has an init session, check its status
    if (project.initial_scan_session_id) {
      try {
        const scanResponse = await fetch(
          `/api/projects/${project.id}/initial-scan`,
        );
        if (scanResponse.ok) {
          const scanData = await scanResponse.json();
          // If first turn is not completed, go to init page
          if (scanData.initial_scan_turn_status !== "completed") {
            window.location.href = `/projects/${project.id}/init`;
            return;
          }
        }
      } catch {
        // If fetch fails, proceed to workspace
      }
    }

    // Otherwise go to the workspace project page
    const newUrl =
      currentUrl.origin.replace("www.", "app.") + `/projects/${project.id}`;
    window.location.href = newUrl;
  };

  // Check GitHub installation status
  useEffect(() => {
    const checkGitHubInstallation = async () => {
      const response = await fetch("/api/github/installation-status");
      if (response.ok) {
        const data: InstallationStatusResponse = await response.json();
        setHasGitHubInstallation(!!data.installation);
      } else {
        setHasGitHubInstallation(false);
      }
      setCheckingGitHub(false);
    };

    checkGitHubInstallation();
  }, []);

  // Load projects from API
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const response = await fetch("/api/projects");
        if (!response.ok) {
          throw new Error("Failed to fetch projects");
        }
        const data: ListProjectsResponse = await response.json();
        setProjects(data.projects || []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load projects",
        );
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, []);

  // Load star counts for projects with repositories
  useEffect(() => {
    if (projects.length === 0) return;

    const loadStarCounts = async () => {
      // Fetch star counts for all projects with repositories
      const reposToFetch = projects.filter((p) => p.source_repo_url);

      for (const project of reposToFetch) {
        if (!project.source_repo_url) continue;

        try {
          const response = await fetch(
            `/api/github/repo-stats?repoUrl=${encodeURIComponent(project.source_repo_url)}`,
          );

          if (response.ok) {
            const data = await response.json();
            setStarCounts((prev) => ({
              ...prev,
              [project.source_repo_url!]: data.stargazersCount,
            }));
          }
        } catch (err) {
          // Silently fail for individual repos - don't block UI
          console.error(
            `Failed to fetch stars for ${project.source_repo_url}:`,
            err,
          );
        }
      }
    };

    loadStarCounts();
  }, [projects]);

  // Redirect to GitHub onboarding if no installation
  useEffect(() => {
    if (!checkingGitHub && hasGitHubInstallation === false) {
      // Prevent redirect loop with sessionStorage
      const redirectAttempt = sessionStorage.getItem(
        "github_onboarding_redirect",
      );
      if (redirectAttempt) {
        // Already tried to redirect, don't loop
        return;
      }
      sessionStorage.setItem("github_onboarding_redirect", "true");
      window.location.href = "/onboarding/github";
    }
  }, [checkingGitHub, hasGitHubInstallation]);

  // Redirect to new project page if user has no projects
  useEffect(() => {
    if (
      !loading &&
      !checkingGitHub &&
      projects.length === 0 &&
      hasGitHubInstallation
    ) {
      window.location.href = "/projects/new";
    }
  }, [loading, checkingGitHub, projects.length, hasGitHubInstallation]);

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;

    setDeleting(true);

    try {
      const response = await fetch(`/api/projects/${projectToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete project");
      }

      // Remove from projects list
      setProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id));
      setProjectToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete project");
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60),
    );

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}w ago`;

    return date.toLocaleDateString();
  };

  // Get project color based on ID
  const getProjectColor = (projectId: string) => {
    const colors = [
      "bg-blue-500",
      "bg-purple-500",
      "bg-green-500",
      "bg-orange-500",
      "bg-pink-500",
      "bg-teal-500",
    ];
    const hash = projectId.split("").reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  };

  if (loading || checkingGitHub) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />

        <header className="border-b px-6 py-8">
          <div className="mx-auto max-w-7xl">
            <Skeleton className="mb-2 h-10 w-64" />
            <Skeleton className="h-5 w-96" />
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-6 py-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <Skeleton className="h-12 w-12 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Header */}
      <header className="border-b px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="mb-2 text-4xl font-bold tracking-tight">
                Your Projects
              </h1>
              <p className="text-base text-muted-foreground">
                Manage and collaborate on your projects with Claude Code
              </p>
            </div>

            {projects.length > 0 && (
              <Button
                onClick={() => (window.location.href = "/projects/new")}
                size="lg"
              >
                <Plus className="h-5 w-5" />
                New Project
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="group cursor-pointer transition-all hover:shadow-lg"
              onClick={() => navigateToProject(project)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-lg ${getProjectColor(project.id)} text-2xl text-white`}
                    >
                      <FolderOpen className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl">{project.name}</CardTitle>
                      <CardDescription className="mt-1">
                        Updated {formatDate(project.updated_at)}
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      setProjectToDelete(project);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </CardHeader>
              {project.source_repo_url && (
                <CardContent>
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {project.source_repo_url}
                    </Badge>
                    {project.source_repo_url &&
                      starCounts[project.source_repo_url] !== undefined && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">
                            {starCounts[
                              project.source_repo_url
                            ]!.toLocaleString()}
                          </span>
                        </div>
                      )}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!projectToDelete}
        onOpenChange={(open: boolean) => !open && setProjectToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{projectToDelete?.name}
              &quot;? This action cannot be undone and all project data will be
              permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
