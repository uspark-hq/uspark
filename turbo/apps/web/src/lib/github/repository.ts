import { createInstallationOctokit, getInstallationDetails } from "./client";
import { initServices } from "../init-services";
import { githubRepos, githubInstallations } from "../../db/schema/github";
import { eq, and } from "drizzle-orm";

/**
 * Repository creation result
 */
type CreateRepositoryResult = {
  repoId: number;
  repoName: string;
  fullName: string;
  url: string;
  cloneUrl: string;
};

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
 * Creates a GitHub repository for a project
 *
 * @param projectId - The project ID
 * @param installationId - The GitHub App installation ID
 * @returns Repository creation result
 */
export async function createProjectRepository(
  projectId: string,
  installationId: number,
): Promise<CreateRepositoryResult> {
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

  // Get installation Octokit client
  const octokit = await createInstallationOctokit(installationId);

  // Get installation details to determine if it's an organization or user
  const installation = await getInstallationDetails(installationId);

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

  // Generate repository name using first 8 characters of UUID for brevity
  const repoName = `uspark-${projectId.substring(0, 8)}`;

  // Create repository on GitHub - use appropriate endpoint based on account type
  let repo;

  try {
    if (accountType === "Organization") {
      // Create repository in organization
      const { data } = await octokit.request("POST /orgs/{org}/repos", {
        org: accountLogin,
        name: repoName,
        private: true,
        auto_init: true,
        description: `uSpark sync repository for project ${projectId}`,
      });
      repo = data;
    } else {
      // For user accounts, use the user endpoint
      const { data } = await octokit.request("POST /user/repos", {
        name: repoName,
        private: true,
        auto_init: true,
        description: `uSpark sync repository for project ${projectId}`,
      });
      repo = data;
    }
  } catch (error: unknown) {
    if (error instanceof Error && "status" in error) {
      const githubError = error as {
        status: number;
        message: string;
        response?: { data?: unknown };
      };

      // 404 can mean either wrong endpoint or missing permissions
      if (githubError.status === 404) {
        if (accountType !== "Organization") {
          // For user accounts, this might be a GitHub App limitation
          throw new Error(
            `Cannot create repository for user account. GitHub Apps may have limited permissions for personal accounts. ` +
              `Please ensure: 1) The GitHub App is installed on your personal account, 2) The App has 'Administration: write' and 'Contents: write' permissions for repositories.`,
          );
        } else {
          throw new Error(
            `GitHub API endpoint not found for organization ${accountLogin}. Please check the GitHub App installation.`,
          );
        }
      }

      // 403 means permission denied
      if (githubError.status === 403) {
        throw new Error(
          `Permission denied. Please ensure the GitHub App has 'Administration: write' and 'Contents: write' permissions. ` +
            `Error: ${githubError.message}`,
        );
      }

      // 422 means validation error (e.g., repo already exists on GitHub)
      if (githubError.status === 422) {
        throw new Error(
          `Repository creation failed. The repository name '${repoName}' may already exist on GitHub.`,
        );
      }
    }

    throw error;
  }

  // Store repository information in database
  await db.insert(githubRepos).values({
    projectId,
    installationId,
    repoName,
    repoId: repo.id,
  });

  return {
    repoId: repo.id,
    repoName: repo.name,
    fullName: repo.full_name,
    url: repo.html_url,
    cloneUrl: repo.clone_url,
  };
}

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
 * Repository list item
 */
type UserRepository = {
  id: number;
  name: string;
  fullName: string;
  installationId: number;
  private: boolean;
  url: string;
};

/**
 * Gets all repositories accessible by user across their installations
 *
 * @param userId - The user ID (Clerk)
 * @returns List of repositories from all user installations
 */
export async function getUserRepositories(
  userId: string,
): Promise<UserRepository[]> {
  const installations = await getUserInstallations(userId);

  const allRepos: UserRepository[] = [];

  // Fetch repositories from each installation
  for (const installation of installations) {
    try {
      const octokit = await createInstallationOctokit(
        installation.installationId,
      );

      // List repositories accessible to the installation
      const { data } = await octokit.request("GET /installation/repositories", {
        per_page: 100, // Get up to 100 repos per installation
      });

      // Transform and add to results
      const repos = data.repositories.map((repo) => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        installationId: installation.installationId,
        private: repo.private,
        url: repo.html_url,
      }));

      allRepos.push(...repos);
    } catch (error) {
      console.error(
        `Failed to fetch repos for installation ${installation.installationId}:`,
        error,
      );
      // Continue with other installations even if one fails
    }
  }

  return allRepos;
}
