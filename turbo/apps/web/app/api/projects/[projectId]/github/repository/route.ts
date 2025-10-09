import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  createProjectRepository,
  getProjectRepository,
  hasInstallationAccess,
} from "../../../../../../src/lib/github/repository";

// Note: Contract reference - projectDetailContract.getGitHubRepository
// Types not used directly due to type compatibility issues with RepositoryInfo

/**
 * GET /api/projects/[projectId]/github/repository
 *
 * Gets repository information for a project
 *
 * Contract: projectDetailContract.getGitHubRepository
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    // Note: Keeping backward compatible format without error_description
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { projectId } = await context.params;

  const repository = await getProjectRepository(projectId);

  if (!repository) {
    // Note: Contract defines "repository_not_linked", but keeping "repository_not_found" for backward compatibility
    return NextResponse.json(
      { error: "repository_not_found" },
      { status: 404 },
    );
  }

  // Verify user has access to this installation
  const hasAccess = await hasInstallationAccess(
    userId,
    repository.installationId,
  );
  if (!hasAccess) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Note: Not using type annotation to avoid type compatibility issues
  // with RepositoryInfo vs contract schema
  return NextResponse.json({ repository });
}

/**
 * POST /api/projects/[projectId]/github/repository
 *
 * Creates a new GitHub repository for a project
 *
 * Body: { installationId: number }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { projectId } = await context.params;

  const body = await request.json();
  const { installationId } = body;

  if (!installationId || typeof installationId !== "number") {
    return NextResponse.json(
      { error: "installation_id_required" },
      { status: 400 },
    );
  }

  // Verify user has access to this installation
  const hasAccess = await hasInstallationAccess(userId, installationId);
  if (!hasAccess) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    // Create new repository
    const repository = await createProjectRepository(projectId, installationId);
    return NextResponse.json({ repository }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      // Handle specific GitHub API errors
      if (error.message.includes("already exists")) {
        return NextResponse.json(
          { error: "repository_already_exists" },
          { status: 409 },
        );
      }

      // Handle GitHub API rate limiting or other errors
      if (error.message.includes("API rate limit")) {
        return NextResponse.json(
          { error: "rate_limit_exceeded" },
          { status: 429 },
        );
      }
    }

    throw error;
  }
}
