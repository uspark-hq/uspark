import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  syncProjectToGitHub,
  getSyncStatus,
} from "../../../../../../src/lib/github/sync";

/**
 * POST /api/projects/:projectId/github/sync
 * Syncs project content to GitHub repository
 */
export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { projectId } = await context.params;

  // Perform the sync
  const result = await syncProjectToGitHub(projectId, userId);

  if (!result.success) {
    if (result.error === "Unauthorized") {
      return NextResponse.json({ error: "unauthorized" }, { status: 403 });
    }

    if (result.error === "Project not found") {
      return NextResponse.json({ error: "project_not_found" }, { status: 404 });
    }

    if (result.error === "Repository not linked to project") {
      return NextResponse.json(
        { error: "repository_not_linked" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "sync_failed", message: result.error },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    commitSha: result.commitSha,
    filesCount: result.filesCount,
    message: result.message,
  });
}

/**
 * GET /api/projects/:projectId/github/sync
 * Gets sync status for a project
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { projectId } = await context.params;

  // Get sync status
  const status = await getSyncStatus(projectId);

  return NextResponse.json(status);
}
