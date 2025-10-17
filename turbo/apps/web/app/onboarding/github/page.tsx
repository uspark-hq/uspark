"use client";

import { useEffect } from "react";
import { Button, Card } from "@uspark/ui";
import {
  Github,
  Zap,
  Lock,
  GitBranch,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Navigation } from "../../components/navigation";
import { type InstallationStatusResponse } from "@uspark/core/contracts/github.contract";

export default function GitHubOnboardingPage() {
  const handleConnect = () => {
    window.location.href = "/api/github/install";
  };

  // Check if user already has GitHub installation (in case they navigate back)
  useEffect(() => {
    const checkInstallation = async () => {
      const response = await fetch("/api/github/installation-status");
      if (response.ok) {
        const data: InstallationStatusResponse = await response.json();
        if (data.installation) {
          // User already has installation, clear redirect flag and go to projects
          sessionStorage.removeItem("github_onboarding_redirect");
          window.location.href = "/projects";
        }
      }
    };

    checkInstallation();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <Navigation />

      <main className="mx-auto max-w-4xl px-6 py-16">
        <div className="text-center mb-12">
          <div className="mb-6 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-xl">
              <Github className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="mb-4 text-5xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Connect Your GitHub Account
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Get started with uSpark by connecting your GitHub repositories
          </p>
        </div>

        <Card className="mb-8 border-2 bg-white dark:bg-gray-900">
          <div className="p-8">
            <h2 className="mb-6 text-2xl font-semibold text-gray-900 dark:text-gray-100">
              What you&apos;ll get:
            </h2>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900">
                  <GitBranch className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="mb-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Seamless Repository Sync
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Connect your GitHub repositories and keep your projects in
                    perfect sync with your codebase.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900">
                  <Zap className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="mb-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Real-time Updates
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Receive automatic updates via webhooks whenever your code
                    changes. Stay up to date effortlessly.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900">
                  <Lock className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="mb-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                    You Control Access
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Choose exactly which repositories to share. You can modify
                    permissions anytime from GitHub settings.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 dark:border-blue-800 dark:from-blue-950 dark:to-indigo-950">
          <div className="p-8 text-center">
            <h2 className="mb-4 text-2xl font-semibold text-gray-900 dark:text-gray-100">
              Ready to get started?
            </h2>
            <p className="mb-6 text-gray-600 dark:text-gray-400">
              Install the uSpark GitHub App in just a few clicks. Takes less
              than a minute.
            </p>

            <Button
              onClick={handleConnect}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 text-lg font-semibold text-white shadow-lg hover:from-blue-700 hover:to-indigo-700"
            >
              <Github className="mr-3 h-6 w-6" />
              Connect GitHub
              <ArrowRight className="ml-3 h-6 w-6" />
            </Button>

            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-500">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>Free for all users</span>
            </div>
          </div>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-500">
            By connecting your GitHub account, you agree to grant uSpark access
            to the repositories you select. You can manage or revoke access at
            any time from your GitHub account settings.
          </p>
        </div>
      </main>
    </div>
  );
}
