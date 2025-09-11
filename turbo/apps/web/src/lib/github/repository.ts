import { getGitHubClient } from "./client";
import { initServices } from "@/lib/init-services";
import { GITHUB_REPOS_TBL } from "@/db/schema/github-tokens";
import { generateSecureToken } from "@/lib/crypto";
import { env } from "@/env";
import { eq } from "drizzle-orm";

interface CreateRepositoryOptions {
  userId: string;
  projectId: string;
  repoName: string;
  description?: string;
  isPrivate?: boolean;
}

/**
 * Creates a new GitHub repository for a project
 */
export async function createGitHubRepository({
  userId,
  projectId,
  repoName,
  description = "uSpark workspace documents",
  isPrivate = false,
}: CreateRepositoryOptions) {
  const octokit = await getGitHubClient(userId);
  
  if (!octokit) {
    throw new Error("GitHub not connected");
  }
  
  const { data: repo } = await octokit.repos.createForAuthenticatedUser({
    name: repoName,
    description,
    private: isPrivate,
    auto_init: true,
    gitignore_template: "Node",
  });
  
  const webhookSecret = generateSecureToken();
  const environment = env();
  
  const { data: webhook } = await octokit.repos.createWebhook({
    owner: repo.owner.login,
    repo: repo.name,
    config: {
      url: `${environment.APP_URL}/api/webhooks/github`,
      content_type: "json",
      secret: webhookSecret,
    },
    events: ["push", "pull_request"],
  });
  
  initServices();
  const { db } = globalThis.services;
  
  await db.insert(GITHUB_REPOS_TBL).values({
    projectId,
    userId,
    repoName: repo.name,
    repoFullName: repo.full_name,
    repoId: repo.id.toString(),
    defaultBranch: repo.default_branch,
    webhookId: webhook.id.toString(),
    webhookSecret,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  
  return {
    repoUrl: repo.html_url,
    cloneUrl: repo.clone_url,
    sshUrl: repo.ssh_url,
  };
}

/**
 * Gets repository information for a project
 */
export async function getProjectRepository(projectId: string) {
  initServices();
  const { db } = globalThis.services;
  
  const repo = await db
    .select()
    .from(GITHUB_REPOS_TBL)
    .where(eq(GITHUB_REPOS_TBL.projectId, projectId))
    .limit(1);
  
  return repo[0] || null;
}

/**
 * Pushes files to GitHub repository
 */
export async function pushToGitHub(
  userId: string,
  projectId: string,
  files: Array<{ path: string; content: string }>,
  commitMessage: string
) {
  const octokit = await getGitHubClient(userId);
  
  if (!octokit) {
    throw new Error("GitHub not connected");
  }
  
  const repo = await getProjectRepository(projectId);
  
  if (!repo) {
    throw new Error("Repository not found");
  }
  
  const [owner, repoName] = repo.repoFullName.split("/");
  
  const { data: ref } = await octokit.git.getRef({
    owner,
    repo: repoName,
    ref: `heads/${repo.defaultBranch}`,
  });
  
  const { data: commit } = await octokit.git.getCommit({
    owner,
    repo: repoName,
    commit_sha: ref.object.sha,
  });
  
  const blobs = await Promise.all(
    files.map(async (file) => {
      const { data: blob } = await octokit.git.createBlob({
        owner,
        repo: repoName,
        content: Buffer.from(file.content).toString("base64"),
        encoding: "base64",
      });
      return {
        path: file.path,
        mode: "100644" as const,
        type: "blob" as const,
        sha: blob.sha,
      };
    })
  );
  
  const { data: tree } = await octokit.git.createTree({
    owner,
    repo: repoName,
    tree: blobs,
    base_tree: commit.tree.sha,
  });
  
  const { data: newCommit } = await octokit.git.createCommit({
    owner,
    repo: repoName,
    message: commitMessage,
    tree: tree.sha,
    parents: [ref.object.sha],
  });
  
  await octokit.git.updateRef({
    owner,
    repo: repoName,
    ref: `heads/${repo.defaultBranch}`,
    sha: newCommit.sha,
  });
  
  initServices();
  const { db } = globalThis.services;
  
  await db
    .update(GITHUB_REPOS_TBL)
    .set({
      lastPushedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(GITHUB_REPOS_TBL.projectId, projectId));
  
  return newCommit.sha;
}