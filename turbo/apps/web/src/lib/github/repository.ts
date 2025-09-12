import { createInstallationOctokit } from "./client";
import { initServices } from "../init-services";
import { githubRepos, githubInstallations } from "../../db/schema/github";
import { eq, and } from "drizzle-orm";

/**
 * Repository creation result
 */
export type CreateRepositoryResult = {
  repoId: number;
  repoName: string;
  fullName: string;
  url: string;
  cloneUrl: string;
};

/**
 * Repository information
 */
export type RepositoryInfo = {
  id: string;
  projectId: string;
  installationId: number;
  repoName: string;
  repoId: number;
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
  installationId: number
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
  
  // Generate repository name
  const repoName = `uspark-${projectId}`;
  
  // Create repository on GitHub
  const { data: repo } = await octokit.request("POST /user/repos", {
    name: repoName,
    private: true,
    auto_init: true,
    description: `uSpark sync repository for project ${projectId}`,
  });
  
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
  projectId: string
): Promise<RepositoryInfo | null> {
  initServices();
  const db = globalThis.services.db;
  
  const repos = await db
    .select()
    .from(githubRepos)
    .where(eq(githubRepos.projectId, projectId))
    .limit(1);
  
  if (repos.length === 0) {
    return null;
  }
  
  return repos[0] as RepositoryInfo;
}

/**
 * Gets repository information from GitHub API
 * 
 * @param installationId - The GitHub App installation ID
 * @param repoName - The repository name
 * @returns GitHub repository data
 */
export async function getGitHubRepository(
  installationId: number,
  repoName: string
) {
  const octokit = await createInstallationOctokit(installationId);
  
  // Get installation details to determine the owner
  const { data: installation } = await octokit.request("GET /app/installations/{installation_id}", {
    installation_id: installationId,
  });
  
  const owner = installation.account && 'login' in installation.account 
    ? installation.account.login 
    : null;
  if (!owner) {
    throw new Error("Could not determine repository owner");
  }
  
  const { data: repo } = await octokit.request("GET /repos/{owner}/{repo}", {
    owner,
    repo: repoName,
  });
  
  return repo;
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
  installationId: number
): Promise<boolean> {
  initServices();
  const db = globalThis.services.db;
  
  const installations = await db
    .select()
    .from(githubInstallations)
    .where(
      and(
        eq(githubInstallations.userId, userId),
        eq(githubInstallations.installationId, installationId)
      )
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
 * Removes repository link from database (does not delete GitHub repo)
 * 
 * @param projectId - The project ID
 * @returns Number of deleted records
 */
export async function removeRepositoryLink(projectId: string): Promise<number> {
  initServices();
  const db = globalThis.services.db;
  
  const result = await db
    .delete(githubRepos)
    .where(eq(githubRepos.projectId, projectId));
  
  return result.rowCount || 0;
}