import { createInstallationOctokit } from "./client";
import { getProjectRepository } from "./repository";
import { initServices } from "../init-services";
import { PROJECTS_TBL } from "../../db/schema/projects";
import { githubRepos } from "../../db/schema/github";
import { eq } from "drizzle-orm";
import * as Y from "yjs";

/**
 * File information for syncing
 */
interface FileInfo {
  path: string;
  hash: string;
  mtime: number;
  size?: number;
}

/**
 * Sync result information
 */
interface SyncResult {
  success: boolean;
  commitSha?: string;
  filesCount?: number;
  message?: string;
  error?: string;
}

/**
 * Extracts file information from YDoc
 *
 * @param ydocData - Base64 encoded YDoc data
 * @returns Array of file information
 */
function extractFilesFromYDoc(ydocData: string): FileInfo[] {
  const binaryData = Buffer.from(ydocData, "base64");
  const ydoc = new Y.Doc();
  Y.applyUpdate(ydoc, new Uint8Array(binaryData));

  const filesMap = ydoc.getMap<{ hash: string; mtime: number }>("files");
  const blobsMap = ydoc.getMap<{ size: number }>("blobs");

  const files: FileInfo[] = [];

  filesMap.forEach((metadata, path) => {
    const blobInfo = blobsMap.get(metadata.hash);
    files.push({
      path,
      hash: metadata.hash,
      mtime: metadata.mtime,
      size: blobInfo?.size,
    });
  });

  return files;
}

/**
 * Fetches file content from Vercel Blob Storage
 *
 * @param projectId - The project ID
 * @param hash - The file hash
 * @returns File content as Buffer
 */
async function fetchBlobContent(
  projectId: string,
  hash: string,
): Promise<Buffer> {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    throw new Error("Blob storage not configured");
  }

  // Construct the blob URL
  const parts = blobToken.split("_");
  if (parts.length < 4 || !parts[3]) {
    throw new Error("Invalid BLOB_READ_WRITE_TOKEN format");
  }
  const storeId = parts[3];
  const blobUrl = `https://${storeId}.public.blob.vercel-storage.com/projects/${projectId}/${hash}`;

  // Fetch the blob content using fetch API
  const response = await fetch(blobUrl, {
    headers: {
      Authorization: `Bearer ${blobToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch blob content for hash: ${hash}`);
  }

  // Convert response to buffer
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Creates or updates files in GitHub repository
 *
 * @param octokit - GitHub API client
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param files - Files to sync
 * @param projectId - Project ID for blob fetching
 * @returns Commit SHA
 */
async function createGitHubCommit(
  octokit: ReturnType<typeof createInstallationOctokit> extends Promise<infer T>
    ? T
    : never,
  owner: string,
  repo: string,
  files: FileInfo[],
  projectId: string,
): Promise<string> {
  // Get the current commit SHA of the main branch
  const { data: ref } = await octokit.request(
    "GET /repos/{owner}/{repo}/git/ref/{ref}",
    {
      owner,
      repo,
      ref: "heads/main",
    },
  );

  const currentCommitSha = ref.object.sha;

  // Create blobs for each file
  const blobs = await Promise.all(
    files.map(async (file) => {
      const content = await fetchBlobContent(projectId, file.hash);
      const { data: blob } = await octokit.request(
        "POST /repos/{owner}/{repo}/git/blobs",
        {
          owner,
          repo,
          content: content.toString("base64"),
          encoding: "base64",
        },
      );

      return {
        path: `spec/${file.path}`,
        mode: "100644" as const,
        type: "blob" as const,
        sha: blob.sha,
      };
    }),
  );

  // Create a new tree based on existing tree (preserves files outside /spec)
  const { data: newTree } = await octokit.request(
    "POST /repos/{owner}/{repo}/git/trees",
    {
      owner,
      repo,
      base_tree: currentCommitSha,
      tree: blobs,
    },
  );

  // Create a new commit
  const { data: newCommit } = await octokit.request(
    "POST /repos/{owner}/{repo}/git/commits",
    {
      owner,
      repo,
      message: `chore: sync specs from uSpark\n\nSynced ${files.length} files to /spec directory`,
      tree: newTree.sha,
      parents: [currentCommitSha],
    },
  );

  // Update the reference
  await octokit.request("PATCH /repos/{owner}/{repo}/git/refs/{ref}", {
    owner,
    repo,
    ref: "heads/main",
    sha: newCommit.sha,
  });

  return newCommit.sha;
}

/**
 * Syncs a project's content to its GitHub repository
 *
 * @param projectId - The project ID
 * @param userId - The user ID (Clerk)
 * @returns Sync result
 */
export async function syncProjectToGitHub(
  projectId: string,
  userId: string,
): Promise<SyncResult> {
  initServices();
  const db = globalThis.services.db;

  // Get project data
  const projects = await db
    .select()
    .from(PROJECTS_TBL)
    .where(eq(PROJECTS_TBL.id, projectId))
    .limit(1);

  if (projects.length === 0) {
    return {
      success: false,
      error: "Project not found",
    };
  }

  const project = projects[0]!;

  // Verify user owns the project
  if (project.userId !== userId) {
    return {
      success: false,
      error: "Unauthorized",
    };
  }

  // Get repository information
  const repoInfo = await getProjectRepository(projectId);

  if (!repoInfo) {
    return {
      success: false,
      error: "Repository not linked to project",
    };
  }

  // Extract files from YDoc
  const files = extractFilesFromYDoc(project.ydocData);

  if (files.length === 0) {
    return {
      success: false,
      error: "No files to sync",
    };
  }

  // Get installation Octokit client
  const octokit = await createInstallationOctokit(repoInfo.installationId);

  // Parse repository name (format: owner/repo or just repo)
  const repoParts = repoInfo.repoName.includes("/")
    ? repoInfo.repoName.split("/")
    : ["", repoInfo.repoName];

  const owner = repoParts[0] || ""; // Will be determined from installation
  const repo = repoParts[1] || repoInfo.repoName;

  // If owner is not specified, get it from the installation
  let actualOwner = owner;
  if (!actualOwner) {
    const { data: installation } = await octokit.request(
      "GET /app/installations/{installation_id}",
      {
        installation_id: repoInfo.installationId,
      },
    );
    if (installation.account) {
      actualOwner =
        ("login" in installation.account
          ? installation.account.login
          : installation.account.slug) || "";
    }
  }

  // Create commit with all files
  const commitSha = await createGitHubCommit(
    octokit,
    actualOwner,
    repo,
    files,
    projectId,
  );

  // Update sync state in database
  await db
    .update(githubRepos)
    .set({
      lastSyncCommitSha: commitSha,
      lastSyncAt: new Date(),
    })
    .where(eq(githubRepos.projectId, projectId));

  return {
    success: true,
    commitSha,
    filesCount: files.length,
    message: `Successfully synced ${files.length} files to GitHub`,
  };
}
