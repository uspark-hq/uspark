"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { InitialScanProgress } from "../../../components/initial-scan-progress";
import type { Project } from "@uspark/core";

// Poll interval for checking scan progress (milliseconds)
const SCAN_POLL_INTERVAL_MS = 3000;

export default function ProjectInitPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  // Navigate to project in app subdomain (workspace)
  const navigateToProject = (id: string) => {
    const currentUrl = new URL(window.location.href);
    const newUrl =
      currentUrl.origin.replace("www.", "app.") + `/projects/${id}`;
    window.location.href = newUrl;
  };

  // Fetch project details on mount
  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await fetch("/api/projects");
        if (!response.ok) {
          setError("Failed to fetch project details");
          setLoading(false);
          return;
        }

        const data = await response.json();
        const foundProject = data.projects.find(
          (p: Project) => p.id === projectId,
        );

        if (!foundProject) {
          setError("Project not found");
          setLoading(false);
          return;
        }

        setProject(foundProject);
        setLoading(false);

        // If first turn is completed or failed, redirect immediately
        if (
          foundProject.initial_scan_turn_status === "completed" ||
          foundProject.initial_scan_turn_status === "failed"
        ) {
          navigateToProject(foundProject.id);
        }
      } catch {
        setError("Failed to load project");
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  // Poll for scan completion and auto-redirect when done
  useEffect(() => {
    if (!project || loading) {
      return;
    }

    // Don't poll if first turn is already completed or failed
    if (
      project.initial_scan_turn_status === "completed" ||
      project.initial_scan_turn_status === "failed"
    ) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const response = await fetch("/api/projects");
        if (response.ok) {
          const data = await response.json();
          const updatedProject = data.projects.find(
            (p: Project) => p.id === projectId,
          );
          if (updatedProject) {
            setProject(updatedProject);
            // Auto-redirect when first turn completes or fails
            if (
              updatedProject.initial_scan_turn_status === "completed" ||
              updatedProject.initial_scan_turn_status === "failed"
            ) {
              clearInterval(interval);
              navigateToProject(updatedProject.id);
            }
          }
        }
      } catch {
        // Ignore polling errors
      }
    }, SCAN_POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [project, projectId, loading]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">{error || "Project not found"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-2xl">
        <InitialScanProgress
          progress={project.initial_scan_progress || null}
          projectName={project.name}
        />
      </div>
    </div>
  );
}
