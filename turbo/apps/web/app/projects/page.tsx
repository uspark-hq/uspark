"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Project {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  fileCount?: number;
  totalSize?: number;
}

export default function ProjectsListPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [creating, setCreating] = useState(false);

  // Mock projects data for now
  useEffect(() => {
    // Load mock projects immediately
    const mockProjects: Project[] = [
      {
        id: "demo-project-123",
        name: "Demo Project",
        created_at: new Date(
          Date.now() - 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        fileCount: 7,
        totalSize: 830,
      },
      {
        id: "web-app-456",
        name: "Web Application",
        created_at: new Date(
          Date.now() - 14 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        updated_at: new Date(
          Date.now() - 1 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        fileCount: 23,
        totalSize: 1024 * 15,
      },
      {
        id: "api-service-789",
        name: "API Service",
        created_at: new Date(
          Date.now() - 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        updated_at: new Date(
          Date.now() - 3 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        fileCount: 12,
        totalSize: 1024 * 8,
      },
    ];

    setProjects(mockProjects);
    setLoading(false);
  }, []);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    setCreating(true);

    try {
      // Create project immediately (no artificial delay)
      const newProject: Project = {
        id: `project-${Date.now()}`,
        name: newProjectName.trim(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        fileCount: 0,
        totalSize: 0,
      };

      setProjects((prev) => [newProject, ...prev]);
      setNewProjectName("");
      setShowCreateDialog(false);

      // Navigate to the new project
      router.push(`/projects/${newProject.id}`);
    } catch {
      setError("Failed to create project");
    } finally {
      setCreating(false);
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

            <button
              onClick={() => setShowCreateDialog(true)}
              style={{
                padding: "12px 24px",
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "500",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "#2563eb";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "#3b82f6";
              }}
            >
              <span>+</span>
              New Project
            </button>
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
            <div
              key={project.id}
              onClick={() => router.push(`/projects/${project.id}`)}
              style={{
                border: "1px solid rgba(156, 163, 175, 0.2)",
                borderRadius: "12px",
                padding: "24px",
                backgroundColor: "var(--background)",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.4)";
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow =
                  "0 8px 25px rgba(0, 0, 0, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(156, 163, 175, 0.2)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                <div style={{ fontSize: "32px", marginRight: "12px" }}>📁</div>
                <div>
                  <h3
                    style={{
                      fontSize: "18px",
                      fontWeight: "600",
                      margin: "0 0 4px 0",
                    }}
                  >
                    {project.name}
                  </h3>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "rgba(156, 163, 175, 0.6)",
                      margin: 0,
                    }}
                  >
                    Updated {formatDate(project.updated_at)}
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "14px",
                  color: "rgba(156, 163, 175, 0.8)",
                  paddingTop: "16px",
                  borderTop: "1px solid rgba(156, 163, 175, 0.1)",
                }}
              >
                <span>{project.fileCount || 0} files</span>
                <span>{formatFileSize(project.totalSize || 0)}</span>
              </div>
            </div>
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
            <button
              onClick={() => setShowCreateDialog(true)}
              style={{
                padding: "12px 24px",
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "16px",
                cursor: "pointer",
              }}
            >
              Create Project
            </button>
          </div>
        )}
      </main>

      {/* Create Project Dialog */}
      {showCreateDialog && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "var(--background)",
              borderRadius: "12px",
              padding: "32px",
              width: "400px",
              maxWidth: "90vw",
              border: "1px solid rgba(156, 163, 175, 0.2)",
            }}
          >
            <h3
              style={{
                fontSize: "20px",
                fontWeight: "600",
                margin: "0 0 16px 0",
              }}
            >
              Create New Project
            </h3>

            <div style={{ marginBottom: "24px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "500",
                  marginBottom: "8px",
                  color: "var(--foreground)",
                }}
              >
                Project Name
              </label>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Enter project name..."
                style={{
                  width: "100%",
                  padding: "12px",
                  border: "2px solid rgba(156, 163, 175, 0.2)",
                  borderRadius: "6px",
                  fontSize: "16px",
                  backgroundColor: "var(--background)",
                  color: "var(--foreground)",
                  outline: "none",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "rgba(59, 130, 246, 0.5)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(156, 163, 175, 0.2)";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !creating) {
                    handleCreateProject();
                  } else if (e.key === "Escape") {
                    setShowCreateDialog(false);
                  }
                }}
                autoFocus
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setShowCreateDialog(false)}
                disabled={creating}
                style={{
                  padding: "10px 20px",
                  border: "1px solid rgba(156, 163, 175, 0.2)",
                  borderRadius: "6px",
                  fontSize: "14px",
                  backgroundColor: "transparent",
                  color: "var(--foreground)",
                  cursor: creating ? "not-allowed" : "pointer",
                  opacity: creating ? 0.5 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                disabled={!newProjectName.trim() || creating}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "14px",
                  cursor:
                    !newProjectName.trim() || creating
                      ? "not-allowed"
                      : "pointer",
                  opacity: !newProjectName.trim() || creating ? 0.5 : 1,
                }}
              >
                {creating ? "Creating..." : "Create Project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
