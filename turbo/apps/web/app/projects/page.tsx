"use client";

import { useState, useEffect } from "react";
import {
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
} from "@uspark/ui";

import type { Project } from "@uspark/core";
import {
  type ListProjectsResponse,
  type CreateProjectResponse,
} from "@uspark/core/contracts/projects.contract";
import { Navigation } from "../components/navigation";

export default function ProjectsListPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [creating, setCreating] = useState(false);

  // Navigate to project in app subdomain (workspace)
  const navigateToProject = (projectId: string) => {
    const currentUrl = new URL(window.location.href);
    const newUrl =
      currentUrl.origin.replace("www.", "app.") + `/projects/${projectId}`;
    window.location.href = newUrl;
  };

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
    if (!newProjectName.trim()) return;

    setCreating(true);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newProjectName.trim() }),
      });

      if (!response.ok) {
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
      setShowCreateDialog(false);

      // Navigate to the new project
      navigateToProject(newProject.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteProject = async (project: Project) => {
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete project");
      }

      // Remove from projects list
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete project");
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
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

  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "rgba(156, 163, 175, 0.7)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "32px", marginBottom: "16px" }}>📁</div>
          <div>Loading your projects...</div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        fontFamily: "system-ui, -apple-system, sans-serif",
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
      }}
    >
      <Navigation />

      {/* Header */}
      <header
        style={{
          padding: "32px 24px",
          borderBottom: "1px solid rgba(156, 163, 175, 0.2)",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: "32px",
                  fontWeight: "700",
                  margin: "0 0 8px 0",
                }}
              >
                Your Projects
              </h1>
              <p
                style={{
                  fontSize: "16px",
                  color: "rgba(156, 163, 175, 0.8)",
                  margin: 0,
                }}
              >
                Manage and collaborate on your projects with Claude Code
              </p>
            </div>

            <Button onClick={() => setShowCreateDialog(true)} size="lg">
              <span>+</span>
              New Project
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
        {error && (
          <div
            style={{
              padding: "16px",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              borderRadius: "8px",
              color: "#ef4444",
              marginBottom: "24px",
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "24px",
          }}
        >
          {projects.map((project) => (
            <Card key={project.id} className="transition-all hover:shadow-lg">
              <div
                className="cursor-pointer"
                onClick={() => navigateToProject(project.id)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="text-3xl mr-3">📁</div>
                      <div>
                        <CardTitle>{project.name}</CardTitle>
                        <CardDescription>
                          Updated {formatDate(project.updated_at)}
                        </CardDescription>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(project);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>0 files</span>
                    <span>{formatFileSize(0)}</span>
                  </div>
                </CardContent>
              </div>
            </Card>
          ))}
        </div>

        {projects.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "64px 24px",
              color: "rgba(156, 163, 175, 0.6)",
            }}
          >
            <div style={{ fontSize: "64px", marginBottom: "24px" }}>📂</div>
            <h3 style={{ fontSize: "20px", marginBottom: "12px" }}>
              No projects yet
            </h3>
            <p style={{ fontSize: "16px", marginBottom: "32px" }}>
              Create your first project to start collaborating with Claude Code
            </p>
            <Button onClick={() => setShowCreateDialog(true)} size="lg">
              Create Project
            </Button>
          </div>
        )}
      </main>

      {/* Create Project Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Give your project a name to get started.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="name" className="text-sm font-medium">
                Project Name
              </label>
              <input
                id="name"
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Enter project name..."
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !creating) {
                    handleCreateProject();
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
