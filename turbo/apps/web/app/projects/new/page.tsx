"use client";

import { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from "@uspark/ui";
import { RepoInput } from "../../components/repo-input";
import { Github, FileText, Loader2, Check } from "lucide-react";

type ProjectCreationStep = "choice" | "repository" | "manual" | "ready";

interface SelectedRepo {
  type: "installed" | "public";
  fullName: string;
  repoName: string;
  installationId?: number;
}

export default function NewProjectPage() {
  const [currentStep, setCurrentStep] = useState<ProjectCreationStep>("choice");
  const [selectedRepo, setSelectedRepo] = useState<SelectedRepo | null>(null);
  const [projectName, setProjectName] = useState("");
  const [useGitHub, setUseGitHub] = useState<boolean | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string>();

  // Navigate to project in app subdomain (workspace)
  const navigateToProject = (projectId: string) => {
    const currentUrl = new URL(window.location.href);
    const newUrl =
      currentUrl.origin.replace("www.", "app.") + `/projects/${projectId}`;
    window.location.href = newUrl;
  };

  const handleChooseGitHub = () => {
    setUseGitHub(true);
    setCurrentStep("repository");
  };

  const handleChooseManual = () => {
    setUseGitHub(false);
    setCurrentStep("manual");
  };

  const handleRepoVerified = (result: SelectedRepo) => {
    setSelectedRepo(result);
  };

  const handleContinueFromRepo = () => {
    if (!selectedRepo) return;
    setCurrentStep("ready");
  };

  const handleContinueFromManual = () => {
    if (!projectName.trim()) return;
    setCurrentStep("ready");
  };

  const handleCreateProject = async () => {
    // GitHub mode: need selectedRepo
    if (useGitHub && !selectedRepo) return;
    // Manual mode: need projectName
    if (!useGitHub && !projectName.trim()) return;

    setCreating(true);
    setError(undefined);

    // Build request body based on mode
    let body;
    if (useGitHub && selectedRepo) {
      body = {
        name: selectedRepo.repoName,
        sourceRepoUrl: selectedRepo.fullName,
        ...(selectedRepo.installationId && {
          installationId: selectedRepo.installationId,
        }),
      };
    } else {
      body = {
        name: projectName.trim(),
      };
    }

    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    // FAIL-FAST: Early return on error
    if (!response.ok) {
      const data = await response.json();
      setError(data.error_description || "Failed to create project");
      setCreating(false);
      return;
    }

    const data = await response.json();

    // For manual projects (no GitHub), go directly to workspace
    if (!useGitHub) {
      navigateToProject(data.id);
      return;
    }

    // For GitHub projects with installation, redirect to init page to show scan progress
    if (selectedRepo?.type === "installed") {
      window.location.href = `/projects/${data.id}/init`;
      return;
    }

    // For public repos (no scan), go directly to workspace
    navigateToProject(data.id);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-2xl">
        {/* Progress indicator */}
        <div className="mb-8 flex items-center justify-center gap-2">
          <StepIndicator
            number={1}
            label={
              useGitHub === null
                ? "Setup"
                : useGitHub
                  ? "Repository"
                  : "Project"
            }
            active={
              currentStep === "choice" ||
              currentStep === "repository" ||
              currentStep === "manual"
            }
            completed={currentStep === "ready"}
          />
        </div>

        {/* Step 0: Choice */}
        {currentStep === "choice" && (
          <Card>
            <CardHeader>
              <CardTitle>Create a New Project</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Choose how you want to set up your project
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* GitHub Repository Option */}
                <button
                  onClick={handleChooseGitHub}
                  className="w-full rounded-lg border-2 border-border bg-card p-6 text-left transition-all hover:border-primary hover:bg-accent"
                >
                  <div className="flex items-start gap-4">
                    <div className="rounded-lg bg-primary/10 p-3">
                      <Github className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">GitHub Repository</h3>
                      <p className="text-sm text-muted-foreground">
                        Import from any GitHub repository (public or private)
                      </p>
                    </div>
                  </div>
                </button>

                {/* Manual Option */}
                <button
                  onClick={handleChooseManual}
                  className="w-full rounded-lg border-2 border-border bg-card p-6 text-left transition-all hover:border-primary hover:bg-accent"
                >
                  <div className="flex items-start gap-4">
                    <div className="rounded-lg bg-primary/10 p-3">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">
                        Create Project Manually
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Start with a blank project without connecting to GitHub
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Repository Input */}
        {currentStep === "repository" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-3">
                  <Github className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Enter GitHub Repository</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Enter any GitHub repository URL
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <RepoInput onRepoVerified={handleRepoVerified} />
                <Button
                  onClick={handleContinueFromRepo}
                  disabled={!selectedRepo}
                  className="w-full"
                  size="lg"
                >
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Manual Project Name */}
        {currentStep === "manual" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-3">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Name Your Project</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Choose a name for your new project
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="project-name"
                    className="text-sm font-medium mb-2 block"
                  >
                    Project Name
                  </label>
                  <Input
                    id="project-name"
                    type="text"
                    placeholder="My Awesome Project"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && projectName.trim()) {
                        handleContinueFromManual();
                      }
                    }}
                    autoFocus
                  />
                </div>
                <Button
                  onClick={handleContinueFromManual}
                  disabled={!projectName.trim()}
                  className="w-full"
                  size="lg"
                >
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Ready */}
        {currentStep === "ready" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-500/10 p-3">
                  <Check className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <CardTitle>You&apos;re All Set!</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Ready to start analyzing your repository
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {error && (
                  <div className="rounded-lg border border-destructive bg-destructive/10 p-3">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}
                <div className="rounded-lg border bg-muted/50 p-4">
                  <h4 className="font-medium mb-3">What happens next:</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5" />
                      <span>
                        Your project will be created:{" "}
                        <strong>
                          {useGitHub ? selectedRepo?.repoName : projectName}
                        </strong>
                      </span>
                    </li>
                    {useGitHub && (
                      <li className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-primary mt-0.5" />
                        <span>
                          Initial repository scan will begin automatically
                        </span>
                      </li>
                    )}
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5" />
                      <span>
                        You&apos;ll be taken to your project workspace
                      </span>
                    </li>
                  </ul>
                </div>
                <Button
                  onClick={handleCreateProject}
                  disabled={creating}
                  className="w-full"
                  size="lg"
                >
                  {creating ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Creating Project...
                    </>
                  ) : useGitHub ? (
                    "Start Scanning"
                  ) : (
                    "Create Project"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function StepIndicator({
  number,
  label,
  active,
  completed,
}: {
  number: number;
  label: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors ${
          completed
            ? "border-primary bg-primary text-primary-foreground"
            : active
              ? "border-primary bg-background text-primary"
              : "border-border bg-background text-muted-foreground"
        }`}
      >
        {completed ? <Check className="h-5 w-5" /> : number}
      </div>
      <span
        className={`text-xs font-medium ${active || completed ? "text-foreground" : "text-muted-foreground"}`}
      >
        {label}
      </span>
    </div>
  );
}
