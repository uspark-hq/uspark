"use client";

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Skeleton,
} from "@uspark/ui";
import { Trash2, FolderOpen, Plus } from "lucide-react";

import type { Project } from "@uspark/core";
import {
  type ListProjectsResponse,
  type CreateProjectResponse,
} from "@uspark/core/contracts/projects.contract";
import { Navigation } from "../components/navigation";
import {
  GitHubRepoSelector,
  type Repository,
} from "../components/github-repo-selector";

export default function ProjectsListPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<{
    repo: Repository;
    installationId: number;
  } | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [hasGitHubInstallation, setHasGitHubInstallation] = useState<
    boolean | null
  >(null);
  const [checkingGitHub, setCheckingGitHub] = useState(true);

  // Navigate to project in app subdomain (workspace)
  const navigateToProject = (projectId: string) => {
    const currentUrl = new URL(window.location.href);
    const newUrl =
      currentUrl.origin.replace("www.", "app.") + `/projects/${projectId}`;
    window.location.href = newUrl;
  };

  // Check GitHub installation status
  useEffect(() => {
    const checkGitHubInstallation = async () => {
      try {
        const response = await fetch("/api/github/installation-status");
        if (!response.ok) {
          throw new Error("Failed to check GitHub installation");
        }
        const data = await response.json();
        setHasGitHubInstallation(data.installation !== null);
      } catch (err) {
        console.error("Failed to check GitHub installation:", err);
        setHasGitHubInstallation(false);
      } finally {
        setCheckingGitHub(false);
      }
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

  const handleCreateProject = async () => {
    // Auto-fill project name from repository name if not provided
    let projectName = newProjectName.trim();
    if (!projectName && selectedRepo) {
      // Use repository name (without owner prefix)
      projectName = selectedRepo.repo.name;
    }

    if (!projectName) return;

    setCreating(true);

    try {
      const requestBody: {
        name: string;
        sourceRepoUrl?: string;
        installationId?: number;
      } = { name: projectName };

      // Add source repository if selected
      if (selectedRepo) {
        requestBody.sourceRepoUrl = selectedRepo.repo.fullName;
        requestBody.installationId = selectedRepo.installationId;
      }

      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error === "duplicate_project_name") {
          throw new Error(
            errorData.error_description ||
              "A project with this name already exists",
          );
        }
        throw new Error("Failed to create project");
      }

      const newProject: CreateProjectResponse = await response.json();

      // Add to projects list with default updated_at same as created_at
      setProjects((prev) => [
        {
          ...newProject,
          updated_at: newProject.created_at,
        },
        ...prev,
      ]);
      setNewProjectName("");
      setSelectedRepo(null);
      setShowCreateDialog(false);

      // Navigate to the new project
      navigateToProject(newProject.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  };

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
              <Button onClick={() => setShowCreateDialog(true)} size="lg">
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

        {projects.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="group cursor-pointer transition-all hover:shadow-lg"
                onClick={() => navigateToProject(project.id)}
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
                        <CardTitle className="text-xl">
                          {project.name}
                        </CardTitle>
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
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {project.source_repo_url}
                      </Badge>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            {/* New user bootstrap flow */}
            {!hasGitHubInstallation ? (
              // Case 1: No GitHub installation - guide user to setup
              <>
                <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-muted">
                  <FolderOpen className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="mb-2 text-2xl font-semibold">
                  Welcome to uSpark
                </h3>
                <p className="mb-4 max-w-md text-muted-foreground">
                  To create your first project, connect your GitHub account to
                  enable repository scanning and analysis.
                </p>
                <div className="mb-8 rounded-lg border border-muted bg-muted/20 p-4 max-w-md">
                  <div className="flex items-start gap-3 text-left">
                    <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-primary/10">
                      <span className="text-sm font-semibold text-primary">
                        1
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Setup GitHub</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Connect uSpark to your GitHub repositories
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 text-left mt-3">
                    <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-primary/10">
                      <span className="text-sm font-semibold text-primary">
                        2
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Select Repository</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Choose a repository to create your first project
                      </p>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => (window.location.href = "/settings/github")}
                  size="lg"
                >
                  <Plus className="h-5 w-5" />
                  Setup GitHub
                </Button>
              </>
            ) : (
              // Case 2: Has GitHub installation - show repository selection
              <>
                <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-muted">
                  <FolderOpen className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="mb-2 text-2xl font-semibold">
                  Create Your First Project
                </h3>
                <p className="mb-8 max-w-md text-muted-foreground">
                  Select a GitHub repository to bootstrap your project. uSpark
                  will analyze the repository and generate initial
                  documentation.
                </p>
                <Card className="w-full max-w-2xl text-left">
                  <CardHeader>
                    <CardTitle>Select Repository</CardTitle>
                    <CardDescription>
                      Choose a repository from your connected GitHub account
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <GitHubRepoSelector
                      onSelect={(repo, installationId) => {
                        if (repo && installationId) {
                          setSelectedRepo({ repo, installationId });
                          // Auto-fill project name with repository name
                          setNewProjectName(repo.name);
                        } else {
                          setSelectedRepo(null);
                          setNewProjectName("");
                        }
                      }}
                      value={
                        selectedRepo
                          ? {
                              repoUrl: selectedRepo.repo.fullName,
                              installationId: selectedRepo.installationId,
                            }
                          : null
                      }
                    />
                    {selectedRepo && (
                      <>
                        <div className="grid gap-2">
                          <label htmlFor="name" className="text-sm font-medium">
                            Project Name
                          </label>
                          <Input
                            id="name"
                            type="text"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            placeholder="Enter project name..."
                          />
                          <p className="text-xs text-muted-foreground">
                            We&apos;ve auto-filled this with your repository
                            name. You can change it if needed.
                          </p>
                        </div>
                        <div className="flex justify-end gap-3">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedRepo(null);
                              setNewProjectName("");
                            }}
                            disabled={creating}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleCreateProject}
                            disabled={!newProjectName.trim() || creating}
                          >
                            {creating ? "Creating..." : "Create Project"}
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}
      </main>

      {/* Create Project Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Select a GitHub repository to bootstrap your project, or create an
              empty project.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="repo" className="text-sm font-medium">
                Source Repository (Optional)
              </label>
              <GitHubRepoSelector
                onSelect={(repo, installationId) => {
                  if (repo && installationId) {
                    setSelectedRepo({ repo, installationId });
                    // Auto-fill project name with repository name if not already set
                    if (!newProjectName) {
                      setNewProjectName(repo.name);
                    }
                  } else {
                    setSelectedRepo(null);
                  }
                }}
                value={
                  selectedRepo
                    ? {
                        repoUrl: selectedRepo.repo.fullName,
                        installationId: selectedRepo.installationId,
                      }
                    : null
                }
              />
              {selectedRepo && (
                <p className="text-xs text-muted-foreground">
                  uSpark will analyze this repository and generate initial
                  documentation (takes 2-5 minutes).
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <label htmlFor="name" className="text-sm font-medium">
                Project Name
              </label>
              <Input
                id="name"
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder={
                  selectedRepo
                    ? "Auto-filled from repository name"
                    : "Enter project name..."
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !creating) {
                    handleCreateProject();
                  }
                }}
              />
              {selectedRepo && newProjectName === selectedRepo.repo.name && (
                <p className="text-xs text-muted-foreground">
                  Using repository name. You can change it if needed.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                setNewProjectName("");
                setSelectedRepo(null);
              }}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={(!newProjectName.trim() && !selectedRepo) || creating}
            >
              {creating ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!projectToDelete}
        onOpenChange={(open) => !open && setProjectToDelete(null)}
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
