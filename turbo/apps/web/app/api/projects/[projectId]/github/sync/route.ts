import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import type { z } from "zod";
import {
  syncProjectToGitHub,
  getSyncStatus,
} from "../../../../../../src/lib/github/sync";
import { projectDetailContract } from "@uspark/core";

// Extract types from contract
type GitHubSyncResponse = z.infer<
  (typeof projectDetailContract.syncToGitHub.responses)[200]
>;
type SyncErrorResponse = z.infer<
  (typeof projectDetailContract.syncToGitHub.responses)[400]
>;
type UnauthorizedResponse = z.infer<
  (typeof projectDetailContract.syncToGitHub.responses)[401]
>;

/**
 * POST /api/projects/:projectId/github/sync
 * Syncs project content to GitHub repository
 *
 * Contract: projectDetailContract.syncToGitHub
 */
export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  const { userId } = await auth();

  if (!userId) {
    const error: UnauthorizedResponse = {
      error: "unauthorized",
      error_description: "Authentication required",
    };
    return NextResponse.json(error, { status: 401 });
  }

  const { projectId } = await context.params;

  // Perform the sync
  const result = await syncProjectToGitHub(projectId, userId);

  if (!result.success) {
    if (result.error === "Unauthorized") {
      const error: UnauthorizedResponse = {
        error: "unauthorized",
        error_description: "Not authorized to sync this project",
      };
      return NextResponse.json(error, { status: 403 });
    }

    if (result.error === "Project not found") {
      // Note: Contract doesn't define 404, keeping for backward compatibility
      return NextResponse.json({ error: "project_not_found" }, { status: 404 });
    }

    if (result.error === "Repository not linked to project") {
      const error: SyncErrorResponse = {
        error: "repository_not_linked",
        message: result.error,
      };
      return NextResponse.json(error, { status: 400 });
    }

    // Note: Contract doesn't define 500, keeping for backward compatibility
    return NextResponse.json(
      { error: "sync_failed", message: result.error },
      { status: 500 },
    );
  }

  const response: GitHubSyncResponse = {
    filesCount: result.filesCount,
  };
  return NextResponse.json(response);
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
