"use client";

import { useState, useEffect } from "react";

interface GitHubInstallation {
  id: string;
  installationId: number;
  accountName: string;
  createdAt: Date;
  updatedAt: Date;
}

interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  owner: {
    login: string;
    type: string;
  };
  description: string | null;
  updated_at: string;
  installation_id: number;
  account_name: string;
}

interface GitHubSyncButtonProps {
  projectId: string;
}

export function GitHubSyncButton({ projectId }: GitHubSyncButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCreatingRepo, setIsCreatingRepo] = useState(false);
  const [hasRepository, setHasRepository] = useState<boolean | null>(null);
  const [repositoryInfo, setRepositoryInfo] = useState<{
    fullName?: string;
    accountName?: string;
    repoName?: string;
  } | null>(null);
  const [installations, setInstallations] = useState<GitHubInstallation[]>([]);
  const [selectedInstallationId, setSelectedInstallationId] = useState<
    number | null
  >(null);
  const [isLoadingInstallations, setIsLoadingInstallations] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });
  const [linkMode, setLinkMode] = useState<"existing" | "create">("existing");
  const [availableRepositories, setAvailableRepositories] = useState<GitHubRepository[]>([]);
  const [selectedRepositoryId, setSelectedRepositoryId] = useState<number | null>(null);
  const [isLoadingRepositories, setIsLoadingRepositories] = useState(false);

  // Check if repository is linked on mount
  useEffect(() => {
    const checkRepository = async () => {
      try {
        const response = await fetch(
          `/api/projects/${projectId}/github/repository`,
        );
        if (response.ok) {
          const data = await response.json();
          setHasRepository(true);
          setRepositoryInfo({
            fullName: data.repository.fullName,
            accountName: data.repository.accountName,
            repoName: data.repository.repoName,
          });
        } else {
          setHasRepository(false);
          setRepositoryInfo(null);
        }
      } catch {
        setHasRepository(false);
        setRepositoryInfo(null);
      }
    };

    checkRepository();
  }, [projectId]);

  // Fetch available GitHub installations
  useEffect(() => {
    const fetchInstallations = async () => {
      if (hasRepository) return; // Don't fetch if already has repository

      setIsLoadingInstallations(true);
      try {
        const response = await fetch("/api/github/installations");
        if (response.ok) {
          const data = await response.json();
          setInstallations(data.installations || []);
          // Auto-select if only one installation
          if (data.installations?.length === 1) {
            setSelectedInstallationId(data.installations[0].installationId);
          }
        }
      } catch {
        console.error("Failed to fetch installations");
      } finally {
        setIsLoadingInstallations(false);
      }
    };

    if (hasRepository === false) {
      fetchInstallations();
    }
  }, [hasRepository]);

  // Fetch available repositories when installations are loaded
  useEffect(() => {
    const fetchRepositories = async () => {
      if (hasRepository || installations.length === 0) return;

      setIsLoadingRepositories(true);
      try {
        const response = await fetch("/api/github/repositories");
        if (response.ok) {
          const data = await response.json();
          setAvailableRepositories(data.repositories || []);
        }
      } catch {
        console.error("Failed to fetch repositories");
      } finally {
        setIsLoadingRepositories(false);
      }
    };

    if (hasRepository === false && installations.length > 0) {
      fetchRepositories();
    }
  }, [hasRepository, installations]);

  // Clear success message after 5 seconds with proper cleanup
  useEffect(() => {
    if (syncStatus.type === "success") {
      const timeoutId = setTimeout(() => {
        setSyncStatus({ type: null, message: "" });
      }, 5000);

      return () => clearTimeout(timeoutId);
    }
  }, [syncStatus.type]);

  const handleLinkExistingRepository = async () => {
    if (!selectedRepositoryId) {
      setSyncStatus({
        type: "error",
        message: "Please select a repository.",
      });
      return;
    }

    setIsCreatingRepo(true);
    setSyncStatus({ type: null, message: "" });

    try {
      const selectedRepo = availableRepositories.find(
        (repo) => repo.id === selectedRepositoryId,
      );

      if (!selectedRepo) {
        setSyncStatus({
          type: "error",
          message: "Selected repository not found.",
        });
        setIsCreatingRepo(false);
        return;
      }

      // Link existing repository
      const response = await fetch(
        `/api/projects/${projectId}/github/repository`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            installationId: selectedRepo.installation_id,
            repositoryId: selectedRepo.id,
            repositoryName: selectedRepo.name,
            owner: selectedRepo.owner.login,
          }),
        },
      );

      const data = await response.json();

      if (response.ok) {
        setHasRepository(true);
        setRepositoryInfo({
          repoName: selectedRepo.name,
          fullName: selectedRepo.full_name,
          accountName: selectedRepo.account_name,
        });
        setSyncStatus({
          type: "success",
          message: `Linked repository: ${selectedRepo.full_name}`,
        });
      } else {
        setSyncStatus({
          type: "error",
          message: data.message || "Failed to link repository",
        });
      }
    } catch {
      setSyncStatus({
        type: "error",
        message: "Network error. Please try again.",
      });
    } finally {
      setIsCreatingRepo(false);
    }
  };

  const handleCreateRepository = async () => {
    if (!selectedInstallationId) {
      setSyncStatus({
        type: "error",
        message: "Please select a GitHub account or organization.",
      });
      return;
    }

    setIsCreatingRepo(true);
    setSyncStatus({ type: null, message: "" });

    try {
      // Create repository with selected installation
      const response = await fetch(
        `/api/projects/${projectId}/github/repository`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            installationId: selectedInstallationId,
          }),
        },
      );

      const data = await response.json();

      if (response.ok) {
        setHasRepository(true);
        // Find the selected installation to get account name
        const selectedInstallation = installations.find(
          (inst) => inst.installationId === selectedInstallationId,
        );
        setRepositoryInfo({
          repoName: data.repository.repoName,
          fullName:
            data.repository.fullName ||
            (selectedInstallation
              ? `${selectedInstallation.accountName}/${data.repository.repoName}`
              : data.repository.repoName),
          accountName: selectedInstallation?.accountName,
        });
        setSyncStatus({
          type: "success",
          message: `Created repository: ${data.repository.fullName || data.repository.repoName}`,
        });
      } else {
        let errorMessage = "Failed to create repository";

        if (data.error === "repository_already_exists") {
          setHasRepository(true);
          errorMessage = "Repository already exists";
        } else if (data.error === "github_not_connected") {
          errorMessage = "Please connect your GitHub account first.";
        } else if (data.message) {
          errorMessage = data.message;
        }

        setSyncStatus({
          type: "error",
          message: errorMessage,
        });
      }
    } catch {
      setSyncStatus({
        type: "error",
        message: "Network error. Please try again.",
      });
    } finally {
      setIsCreatingRepo(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncStatus({ type: null, message: "" });

    try {
      const response = await fetch(`/api/projects/${projectId}/github/sync`, {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        setSyncStatus({
          type: "success",
          message: `Successfully synced ${data.filesCount} files to GitHub`,
        });
      } else {
        let errorMessage = "Sync failed";

        if (data.error === "repository_not_linked") {
          setHasRepository(false);
          errorMessage =
            "No GitHub repository linked. Please create a repository first.";
        } else if (data.error === "unauthorized") {
          errorMessage = "You are not authorized to sync this project.";
        } else if (data.message) {
          errorMessage = data.message;
        }

        setSyncStatus({
          type: "error",
          message: errorMessage,
        });
      }
    } catch {
      setSyncStatus({
        type: "error",
        message: "Network error. Please try again.",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Show loading state while checking repository status
  if (hasRepository === null) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <span
          style={{
            display: "inline-block",
            width: "14px",
            height: "14px",
            border: "2px solid rgba(156, 163, 175, 0.3)",
            borderTopColor: "#0969da",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        <span style={{ fontSize: "14px", color: "rgba(156, 163, 175, 0.8)" }}>
          Checking repository...
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {!hasRepository ? (
        <>
          {/* Mode toggle */}
          {installations.length > 0 && (
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => setLinkMode("existing")}
                disabled={isCreatingRepo || isLoadingRepositories}
                style={{
                  padding: "6px 12px",
                  fontSize: "13px",
                  color: linkMode === "existing" ? "#fff" : "rgba(156, 163, 175, 0.8)",
                  backgroundColor: linkMode === "existing" ? "#0969da" : "transparent",
                  border: "1px solid rgba(156, 163, 175, 0.2)",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Select Existing Repository
              </button>
              <button
                onClick={() => setLinkMode("create")}
                disabled={isCreatingRepo}
                style={{
                  padding: "6px 12px",
                  fontSize: "13px",
                  color: linkMode === "create" ? "#fff" : "rgba(156, 163, 175, 0.8)",
                  backgroundColor: linkMode === "create" ? "#0969da" : "transparent",
                  border: "1px solid rgba(156, 163, 175, 0.2)",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Create New Repository
              </button>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            {linkMode === "existing" ? (
              <>
                {/* Repository selector */}
                {availableRepositories.length > 0 && (
                  <select
                    value={selectedRepositoryId || ""}
                    onChange={(e) =>
                      setSelectedRepositoryId(
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    disabled={isCreatingRepo || isLoadingRepositories}
                    style={{
                      padding: "8px 12px",
                      fontSize: "14px",
                      color: "#fff",
                      backgroundColor: "#1f2937",
                      border: "1px solid rgba(156, 163, 175, 0.2)",
                      borderRadius: "4px",
                      cursor: "pointer",
                      minWidth: "300px",
                    }}
                  >
                    <option value="">Select a repository...</option>
                    {availableRepositories.map((repo) => (
                      <option key={repo.id} value={repo.id}>
                        {repo.full_name} {repo.private ? "🔒" : ""}
                      </option>
                    ))}
                  </select>
                )}

                {/* Link repository button */}
                <button
                  onClick={handleLinkExistingRepository}
                  disabled={
                    isCreatingRepo ||
                    !selectedRepositoryId ||
                    availableRepositories.length === 0
                  }
                  style={{
                    padding: "8px 16px",
                    fontSize: "14px",
                    color:
                      isCreatingRepo || !selectedRepositoryId
                        ? "rgba(156, 163, 175, 0.5)"
                        : "#fff",
                    backgroundColor:
                      isCreatingRepo || !selectedRepositoryId
                        ? "rgba(156, 163, 175, 0.2)"
                        : "#2ea043",
                    border: "1px solid rgba(156, 163, 175, 0.2)",
                    borderRadius: "4px",
                    cursor:
                      isCreatingRepo || !selectedRepositoryId
                        ? "not-allowed"
                        : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  {isCreatingRepo ? (
                    <>
                      <span
                        style={{
                          display: "inline-block",
                          width: "14px",
                          height: "14px",
                          border: "2px solid rgba(156, 163, 175, 0.3)",
                          borderTopColor: "#2ea043",
                          borderRadius: "50%",
                          animation: "spin 1s linear infinite",
                        }}
                      />
                      Linking...
                    </>
                  ) : (
                    <>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        style={{ display: "block" }}
                      >
                        <path d="M7.775 3.275a.75.75 0 001.06 1.06l1.25-1.25a2 2 0 112.83 2.83l-2.5 2.5a2 2 0 01-2.83 0 .75.75 0 00-1.06 1.06 3.5 3.5 0 004.95 0l2.5-2.5a3.5 3.5 0 00-4.95-4.95l-1.25 1.25zm-4.69 9.64a2 2 0 010-2.83l2.5-2.5a2 2 0 012.83 0 .75.75 0 001.06-1.06 3.5 3.5 0 00-4.95 0l-2.5 2.5a3.5 3.5 0 004.95 4.95l1.25-1.25a.75.75 0 00-1.06-1.06l-1.25 1.25a2 2 0 01-2.83 0z" />
                      </svg>
                      Link Repository
                    </>
                  )}
                </button>

                {isLoadingRepositories && (
                  <span style={{ fontSize: "13px", color: "rgba(156, 163, 175, 0.8)" }}>
                    Loading repositories...
                  </span>
                )}
              </>
            ) : (
              <>
                {/* Installation selector */}
                {installations.length > 0 && (
                  <select
                    value={selectedInstallationId || ""}
                    onChange={(e) =>
                      setSelectedInstallationId(
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    disabled={isCreatingRepo || isLoadingInstallations}
                    style={{
                      padding: "8px 12px",
                      fontSize: "14px",
                      color: "#fff",
                      backgroundColor: "#1f2937",
                      border: "1px solid rgba(156, 163, 175, 0.2)",
                      borderRadius: "4px",
                      cursor: "pointer",
                      minWidth: "200px",
                    }}
                  >
                    <option value="">Select GitHub account...</option>
                    {installations.map((installation) => (
                      <option
                        key={installation.id}
                        value={installation.installationId}
                      >
                        {installation.accountName}
                      </option>
                    ))}
                  </select>
                )}

                {/* Create repository button */}
                <button
                  onClick={handleCreateRepository}
                  disabled={
                    isCreatingRepo ||
                    !selectedInstallationId ||
                    installations.length === 0
                  }
                  style={{
                    padding: "8px 16px",
                    fontSize: "14px",
                    color:
                      isCreatingRepo || !selectedInstallationId
                        ? "rgba(156, 163, 175, 0.5)"
                        : "#fff",
                    backgroundColor:
                      isCreatingRepo || !selectedInstallationId
                        ? "rgba(156, 163, 175, 0.2)"
                        : "#2ea043",
                    border: "1px solid rgba(156, 163, 175, 0.2)",
                    borderRadius: "4px",
                    cursor:
                      isCreatingRepo || !selectedInstallationId
                        ? "not-allowed"
                        : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  {isCreatingRepo ? (
                    <>
                      <span
                        style={{
                          display: "inline-block",
                          width: "14px",
                          height: "14px",
                          border: "2px solid rgba(156, 163, 175, 0.3)",
                          borderTopColor: "#2ea043",
                          borderRadius: "50%",
                          animation: "spin 1s linear infinite",
                        }}
                      />
                      Creating Repository...
                    </>
                  ) : (
                    <>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        style={{ display: "block" }}
                      >
                        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                      </svg>
                      Create Repository
                    </>
                  )}
                </button>
              </>
            )}

            {/* Show message if no installations */}
            {installations.length === 0 && !isLoadingInstallations && (
              <div
                style={{
                  padding: "8px 12px",
                  fontSize: "13px",
                  color: "#da3633",
                  backgroundColor: "rgba(218, 54, 51, 0.1)",
                  border: "1px solid rgba(218, 54, 51, 0.3)",
                  borderRadius: "4px",
                }}
              >
                Please connect your GitHub account first in Settings.
              </div>
            )}
          </div>
        </>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {/* Show repository info */}
          {repositoryInfo?.fullName && (
            <div
              style={{
                padding: "8px 12px",
                fontSize: "13px",
                color: "#0969da",
                backgroundColor: "rgba(9, 105, 218, 0.1)",
                border: "1px solid rgba(9, 105, 218, 0.3)",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="currentColor"
                style={{ display: "block", flexShrink: 0 }}
              >
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              <span>{repositoryInfo.fullName}</span>
            </div>
          )}

          {/* Sync button */}
          <button
            onClick={handleSync}
            disabled={isSyncing}
            style={{
              padding: "8px 16px",
              fontSize: "14px",
              color: isSyncing ? "rgba(156, 163, 175, 0.5)" : "#fff",
              backgroundColor: isSyncing
                ? "rgba(156, 163, 175, 0.2)"
                : "#0969da",
              border: "1px solid rgba(156, 163, 175, 0.2)",
              borderRadius: "4px",
              cursor: isSyncing ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {isSyncing ? (
              <>
                <span
                  style={{
                    display: "inline-block",
                    width: "14px",
                    height: "14px",
                    border: "2px solid rgba(156, 163, 175, 0.3)",
                    borderTopColor: "#0969da",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                />
                Syncing...
              </>
            ) : (
              <>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  style={{ display: "block" }}
                >
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                </svg>
                Sync to GitHub
              </>
            )}
          </button>
        </div>
      )}

      {syncStatus.type && (
        <div
          style={{
            padding: "8px 12px",
            fontSize: "13px",
            borderRadius: "4px",
            backgroundColor:
              syncStatus.type === "success"
                ? "rgba(46, 160, 67, 0.1)"
                : "rgba(218, 54, 51, 0.1)",
            color: syncStatus.type === "success" ? "#2ea043" : "#da3633",
            border: `1px solid ${
              syncStatus.type === "success"
                ? "rgba(46, 160, 67, 0.3)"
                : "rgba(218, 54, 51, 0.3)"
            }`,
          }}
        >
          {syncStatus.message}
        </div>
      )}

      <style>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
