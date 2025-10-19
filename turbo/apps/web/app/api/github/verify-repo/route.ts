import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { getUserRepositories } from "../../../../src/lib/github/repository";

const VerifyRepoRequestSchema = z.object({
  repoUrl: z.string().min(1),
});

/**
 * POST /api/github/verify-repo
 *
 * Intelligently verifies a GitHub repository:
 * 1. First checks if the repo is accessible via user's GitHub App installations
 * 2. If not found in installations, checks if it's a public repository
 * 3. Returns the appropriate access type and metadata
 */
export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      {
        error: "unauthorized",
        error_description: "Authentication required",
      },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const { repoUrl } = VerifyRepoRequestSchema.parse(body);

    // Parse owner/repo from various formats
    const normalized = normalizeRepoUrl(repoUrl);
    if (!normalized) {
      return NextResponse.json(
        {
          error: "invalid_format",
          error_description:
            "Invalid repository format. Use 'owner/repo' or GitHub URL",
        },
        { status: 400 },
      );
    }

    // Step 1: Check if repository exists in user's GitHub installations
    const userRepos = await getUserRepositories(userId);
    const installedRepo = userRepos.find(
      (repo) => repo.fullName.toLowerCase() === normalized.toLowerCase(),
    );

    if (installedRepo) {
      return NextResponse.json({
        valid: true,
        type: "installed",
        fullName: installedRepo.fullName,
        installationId: installedRepo.installationId,
        repoName: installedRepo.name,
      });
    }

    // Step 2: Check if it's a public repository
    const [owner, repo] = normalized.split("/");
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "uSpark",
        },
      },
    );

    if (response.status === 404) {
      return NextResponse.json(
        {
          error: "not_found",
          error_description: "Repository not found",
        },
        { status: 404 },
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "github_error",
          error_description: "Failed to verify repository",
        },
        { status: 502 },
      );
    }

    const data = await response.json();

    // Check if repository is private
    if (data.private) {
      return NextResponse.json(
        {
          error: "repository_private",
          error_description:
            "Repository is private and not accessible via your GitHub App installations. Please install the GitHub App for this repository.",
        },
        { status: 403 },
      );
    }

    // It's a public repository
    return NextResponse.json({
      valid: true,
      type: "public",
      fullName: data.full_name,
      repoName: data.name,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "invalid_request",
          error_description: "Invalid request body",
        },
        { status: 400 },
      );
    }

    console.error("Error verifying repository:", error);
    return NextResponse.json(
      {
        error: "internal_error",
        error_description: "Failed to verify repository",
      },
      { status: 500 },
    );
  }
}

/**
 * Normalizes various GitHub repository URL formats to owner/repo
 * Accepts:
 * - owner/repo
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo.git
 * - git@github.com:owner/repo.git
 */
function normalizeRepoUrl(input: string): string | null {
  // Remove whitespace
  input = input.trim();

  // Pattern 1: already in owner/repo format
  if (/^[\w-]+\/[\w-]+$/.test(input)) {
    return input;
  }

  // Pattern 2: HTTPS URL
  const httpsMatch = input.match(/github\.com\/([^/]+\/[^/.]+)/);
  if (httpsMatch?.[1]) {
    return httpsMatch[1];
  }

  // Pattern 3: Git SSH URL
  const sshMatch = input.match(/github\.com:([^/]+\/[^/.]+)/);
  if (sshMatch?.[1]) {
    return sshMatch[1];
  }

  return null;
}
