"use client";

import { useState, useEffect } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from "@uspark/ui";
import { GitHubRepoSelector } from "../../components/github-repo-selector";
import { Check, Github, FolderGit2, FileText, Loader2 } from "lucide-react";

type ProjectCreationStep =
  | "choice"
  | "github"
  | "repository"
  | "manual"
  | "ready";

interface SelectedRepo {
  repo: {
    name: string;
    fullName: string;
  };
  installationId: number;
}

export default function NewProjectPage() {
  const [currentStep, setCurrentStep] = useState<ProjectCreationStep>("choice");
  const [hasGitHub, setHasGitHub] = useState<boolean | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<SelectedRepo | null>(null);
  const [projectName, setProjectName] = useState("");
  const [useGitHub, setUseGitHub] = useState<boolean | null>(null);
  const [creating, setCreating] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [error, setError] = useState<string>();

  // Navigate to project in app subdomain (workspace)
  const navigateToProject = (projectId: string) => {
    const currentUrl = new URL(window.location.href);
    const newUrl =
      currentUrl.origin.replace("www.", "app.") + `/projects/${projectId}`;
    window.location.href = newUrl;
  };

  // Check GitHub status on mount
  useEffect(() => {
    const checkStatus = async () => {
      // Check GitHub installation
      const githubRes = await fetch("/api/github/installation-status");
      if (githubRes.ok) {
        const data = await githubRes.json();
        setHasGitHub(data.installation !== null);
      }

      setCheckingStatus(false);
    };

    checkStatus();
  }, []);

  // Auto-advance steps based on status
  useEffect(() => {
    if (checkingStatus) return;

    // Auto-skip choice step for users with GitHub already connected
    if (currentStep === "choice" && hasGitHub) {
      setUseGitHub(true);
      setCurrentStep("repository");
    }

    // If user chose GitHub and already has it connected, skip to repository
    if (currentStep === "github" && hasGitHub && useGitHub) {
      setCurrentStep("repository");
    }
  }, [checkingStatus, hasGitHub, currentStep, useGitHub]);

  const handleChooseGitHub = () => {
    setUseGitHub(true);
    if (hasGitHub) {
      setCurrentStep("repository");
    } else {
      setCurrentStep("github");
    }
  };

  const handleChooseManual = () => {
    setUseGitHub(false);
    setCurrentStep("manual");
  };

  const handleGitHubSetup = () => {
    window.location.href = "/settings/github";
  };

  const handleRepoSelect = (
    repo: { name: string; fullName: string } | null,
    installationId: number | null,
  ) => {
    if (repo && installationId) {
      setSelectedRepo({ repo, installationId });
    } else {
      setSelectedRepo(null);
    }
  };

  const handleContinueFromRepo = () => {
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
    const body = useGitHub
      ? {
          name: selectedRepo!.repo.name,
          sourceRepoUrl: selectedRepo!.repo.fullName,
          installationId: selectedRepo!.installationId,
        }
      : {
          name: projectName.trim(),
        };

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

    // For GitHub projects, redirect to init page to show scan progress
    window.location.href = `/projects/${data.id}/init`;
  };

  if (checkingStatus) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-2xl">
        {/* Progress indicator */}
        <div className="mb-8 flex items-center justify-center gap-2">
          <StepIndicator
            number={1}
            label={
              useGitHub === null ? "Setup" : useGitHub ? "GitHub" : "Project"
            }
            active={
              currentStep === "choice" ||
              currentStep === "github" ||
              currentStep === "manual"
            }
            completed={currentStep === "repository" || currentStep === "ready"}
          />
          {useGitHub && (
            <>
              <div className="h-px w-12 bg-border" />
              <StepIndicator
                number={2}
                label="Repository"
                active={currentStep === "repository"}
                completed={currentStep === "ready"}
              />
            </>
          )}
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
                {/* GitHub Option */}
                <button
                  onClick={handleChooseGitHub}
                  className="w-full rounded-lg border-2 border-border bg-card p-6 text-left transition-all hover:border-primary hover:bg-accent"
                >
                  <div className="flex items-start gap-4">
                    <div className="rounded-lg bg-primary/10 p-3">
                      <Github className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">
                        Connect GitHub Repository
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Link an existing GitHub repository for AI-powered code
                        analysis and automated scanning
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

        {/* Step 1: GitHub */}
        {currentStep === "github" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-3">
                  <Github className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Connect Your GitHub Account</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    uSpark needs access to your repositories to analyze and
                    assist with your code
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/50 p-4">
                  <h4 className="font-medium mb-2">What you&apos;ll get:</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5" />
                      <span>AI-powered code analysis and suggestions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5" />
                      <span>Automated repository scanning</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5" />
                      <span>Seamless integration with your workflow</span>
                    </li>
                  </ul>
                </div>
                <Button
                  onClick={handleGitHubSetup}
                  className="w-full"
                  size="lg"
                >
                  <Github className="mr-2 h-5 w-5" />
                  Connect GitHub
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Repository */}
        {currentStep === "repository" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-3">
                  <FolderGit2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Select a Repository</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Choose the repository you want to analyze
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <GitHubRepoSelector onSelect={handleRepoSelect} />
                {selectedRepo && (
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <p className="text-sm font-medium">Selected repository:</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedRepo.repo.fullName}
                    </p>
                  </div>
                )}
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

        {/* Step 2b: Manual Project Name */}
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
                          {useGitHub ? selectedRepo?.repo.name : projectName}
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
