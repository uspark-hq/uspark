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
import { Check, Github, FolderGit2, Key } from "lucide-react";

type ProjectCreationStep = "github" | "repository" | "token" | "ready";

interface SelectedRepo {
  repo: {
    name: string;
    fullName: string;
  };
  installationId: number;
}

export default function NewProjectPage() {
  const [currentStep, setCurrentStep] = useState<ProjectCreationStep>("github");
  const [hasGitHub, setHasGitHub] = useState<boolean | null>(null);
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<SelectedRepo | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [creating, setCreating] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Check GitHub and token status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        // Check GitHub installation
        const githubRes = await fetch("/api/github/installation-status");
        if (githubRes.ok) {
          const data = await githubRes.json();
          setHasGitHub(data.installation !== null);
        }

        // Check Claude token
        const tokenRes = await fetch("/api/claude-token");
        if (tokenRes.ok) {
          const data = await tokenRes.json();
          setHasToken(data.token !== null);
        }
      } catch (error) {
        console.error("Failed to check status:", error);
      } finally {
        setCheckingStatus(false);
      }
    };

    checkStatus();
  }, []);

  // Auto-advance steps based on status
  useEffect(() => {
    if (checkingStatus) return;

    if (currentStep === "github" && hasGitHub) {
      setCurrentStep("repository");
    }
  }, [checkingStatus, hasGitHub, currentStep]);

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
    if (hasToken) {
      setCurrentStep("ready");
    } else {
      setCurrentStep("token");
    }
  };

  const handleTokenSubmit = async () => {
    if (!tokenInput.trim()) return;

    try {
      const response = await fetch("/api/claude-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenInput }),
      });

      if (response.ok) {
        setHasToken(true);
        setCurrentStep("ready");
      }
    } catch (error) {
      console.error("Failed to save token:", error);
    }
  };

  const handleCreateProject = async () => {
    if (!selectedRepo) return;

    setCreating(true);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selectedRepo.repo.name,
          sourceRepoUrl: selectedRepo.repo.fullName,
          installationId: selectedRepo.installationId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Navigate to workspace
        window.location.href = `http://app.uspark.com/projects/${data.id}`;
      }
    } catch (error) {
      console.error("Failed to create project:", error);
    } finally {
      setCreating(false);
    }
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
            label="GitHub"
            active={currentStep === "github"}
            completed={hasGitHub === true}
          />
          <div className="h-px w-12 bg-border" />
          <StepIndicator
            number={2}
            label="Repository"
            active={currentStep === "repository"}
            completed={selectedRepo !== null}
          />
          <div className="h-px w-12 bg-border" />
          <StepIndicator
            number={3}
            label={hasToken ? "Ready" : "Token"}
            active={currentStep === "token" || currentStep === "ready"}
            completed={currentStep === "ready"}
          />
        </div>

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

        {/* Step 3: Token (if needed) */}
        {currentStep === "token" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-3">
                  <Key className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Add Your Claude API Key</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    This enables AI-powered analysis of your code
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/50 p-4">
                  <h4 className="font-medium mb-2">How to get your API key:</h4>
                  <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                    <li>Visit console.anthropic.com</li>
                    <li>Sign in or create an account</li>
                    <li>Navigate to API Keys section</li>
                    <li>Create a new key and copy it</li>
                  </ol>
                </div>
                <div>
                  <label
                    htmlFor="token"
                    className="text-sm font-medium block mb-2"
                  >
                    API Key
                  </label>
                  <Input
                    id="token"
                    type="password"
                    placeholder="sk-ant-..."
                    value={tokenInput}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setTokenInput(e.target.value)
                    }
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === "Enter" && tokenInput.trim()) {
                        handleTokenSubmit();
                      }
                    }}
                  />
                </div>
                <Button
                  onClick={handleTokenSubmit}
                  disabled={!tokenInput.trim()}
                  className="w-full"
                  size="lg"
                >
                  Save and Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3/4: Ready */}
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
                <div className="rounded-lg border bg-muted/50 p-4">
                  <h4 className="font-medium mb-3">What happens next:</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5" />
                      <span>
                        Your project will be created:{" "}
                        <strong>{selectedRepo?.repo.name}</strong>
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5" />
                      <span>
                        Initial repository scan will begin automatically
                      </span>
                    </li>
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
                  {creating ? "Creating Project..." : "Start Scanning"}
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
