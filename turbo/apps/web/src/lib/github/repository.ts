import { createInstallationOctokit, getInstallationDetails } from "./client";
import { initServices } from "../init-services";
import { githubRepos, githubInstallations } from "../../db/schema/github";
import { eq, and } from "drizzle-orm";

/**
 * Repository information
 */
type RepositoryInfo = {
  id: string;
  projectId: string;
  installationId: number;
  repoName: string;
  repoId: number;
  accountName?: string | null;
  accountType?: string;
  fullName?: string;
  lastSyncCommitSha?: string | null;
  lastSyncAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Gets repository information for a project
 *
 * @param projectId - The project ID
 * @returns Repository information or null if not found
 */
export async function getProjectRepository(
  projectId: string,
): Promise<RepositoryInfo | null> {
  initServices();
  const db = globalThis.services.db;

  const repos = await db
    .select({
      id: githubRepos.id,
      projectId: githubRepos.projectId,
      installationId: githubRepos.installationId,
      repoName: githubRepos.repoName,
      repoId: githubRepos.repoId,
      lastSyncCommitSha: githubRepos.lastSyncCommitSha,
      lastSyncAt: githubRepos.lastSyncAt,
      createdAt: githubRepos.createdAt,
      updatedAt: githubRepos.updatedAt,
      accountName: githubInstallations.accountName,
    })
    .from(githubRepos)
    .leftJoin(
      githubInstallations,
      eq(githubRepos.installationId, githubInstallations.installationId),
    )
    .where(eq(githubRepos.projectId, projectId))
    .limit(1);

  if (repos.length === 0) {
    return null;
  }

  const repo = repos[0]!;

  // Get installation details to determine account type and get full name
  const installation = await getInstallationDetails(repo.installationId);

  // Handle both user and organization account types
  const accountType = installation.account
    ? "type" in installation.account
      ? installation.account.type
      : "Organization"
    : "unknown";
  const accountLogin = installation.account
    ? "login" in installation.account
      ? installation.account.login
      : installation.account.slug || installation.account.name
    : "unknown";

  return {
    ...repo,
    accountType,
    fullName: `${accountLogin}/${repo.repoName}`,
  };
}

/**
 * Checks if a user has access to an installation
 *
 * @param userId - The user ID (Clerk)
 * @param installationId - The GitHub App installation ID
 * @returns True if user has access
 */
export async function hasInstallationAccess(
  userId: string,
  installationId: number,
): Promise<boolean> {
  initServices();
  const db = globalThis.services.db;

  const installations = await db
    .select()
    .from(githubInstallations)
    .where(
      and(
        eq(githubInstallations.userId, userId),
        eq(githubInstallations.installationId, installationId),
      ),
    )
    .limit(1);

  return installations.length > 0;
}

/**
 * Gets all installations for a user
 *
 * @param userId - The user ID (Clerk)
 * @returns List of user installations
 */
export async function getUserInstallations(userId: string) {
  initServices();
  const db = globalThis.services.db;

  return await db
    .select()
    .from(githubInstallations)
    .where(eq(githubInstallations.userId, userId));
}

/**
 * Repository information from GitHub API
 */
export type GitHubRepository = {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  owner: {
    login: string;
    type: string;
  };
  description: string | null;
  updated_at: string | null;
  permissions?: {
    admin: boolean;
    push: boolean;
    pull: boolean;
    maintain?: boolean;
    triage?: boolean;
  };
};

/**
 * Gets all repositories accessible by an installation
 *
 * @param installationId - The GitHub App installation ID
 * @returns List of repositories
 */
export async function getInstallationRepositories(
  installationId: number,
): Promise<GitHubRepository[]> {
  const octokit = await createInstallationOctokit(installationId);

  // Get all repositories accessible to this installation
  const { data } = await octokit.request("GET /installation/repositories", {
    per_page: 100,
  });

  // Map to our GitHubRepository type
  return data.repositories.map((repo) => ({
    id: repo.id,
    name: repo.name,
    full_name: repo.full_name,
    private: repo.private,
    owner: {
      login: repo.owner.login,
      type: repo.owner.type,
    },
    description: repo.description,
    updated_at: repo.updated_at,
    permissions: repo.permissions,
  }));
}

/**
 * Links an existing GitHub repository to a project
 *
 * @param projectId - The project ID
 * @param installationId - The GitHub App installation ID
 * @param repoId - The GitHub repository ID
 * @param repoName - The repository name
 * @returns Repository information
 */
export async function linkExistingRepository(
  projectId: string,
  installationId: number,
  repoId: number,
  repoName: string,
): Promise<{ repoId: number; repoName: string; fullName: string }> {
  initServices();
  const db = globalThis.services.db;

  // Check if repository already exists for this project
  const existingRepo = await db
    .select()
    .from(githubRepos)
    .where(eq(githubRepos.projectId, projectId))
    .limit(1);

  if (existingRepo.length > 0) {
    throw new Error(`Repository already exists for project ${projectId}`);
  }

  // Get installation details to build full name
  const installation = await getInstallationDetails(installationId);

  const accountLogin = installation.account
    ? "login" in installation.account
      ? installation.account.login
      : installation.account.slug || installation.account.name
    : "unknown";

  const fullName = `${accountLogin}/${repoName}`;

  // Store repository link in database
  await db.insert(githubRepos).values({
    projectId,
    installationId,
    repoName,
    repoId,
  });

  return {
    repoId,
    repoName,
    fullName,
  };
}
