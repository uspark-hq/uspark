import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  createProjectRepository,
  getProjectRepository,
  hasInstallationAccess,
  removeRepositoryLink,
} from "../../../../../../src/lib/github/repository";

/**
 * GET /api/projects/[projectId]/github/repository
 *
 * Gets repository information for a project
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { projectId } = await context.params;

  const repository = await getProjectRepository(projectId);

  if (!repository) {
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

  // Create repository
  try {
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

/**
 * DELETE /api/projects/[projectId]/github/repository
 *
 * Removes repository link from project (does not delete GitHub repo)
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { projectId } = await context.params;

  const repository = await getProjectRepository(projectId);

  if (!repository) {
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

  // Remove repository link from database
  const deletedCount = await removeRepositoryLink(projectId);

  if (deletedCount === 0) {
    return NextResponse.json(
      { error: "repository_not_found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ message: "repository_link_removed" });
}
