import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { syncProjectToGitHub } from "../../../../../../src/lib/github/sync";

// Note: Contract reference - projectDetailContract.syncToGitHub
// Types not used directly due to backward compatibility requirements

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
    // Note: Keeping backward compatible format without error_description
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { projectId } = await context.params;

  // Perform the sync
  const result = await syncProjectToGitHub(projectId, userId);

  if (!result.success) {
    if (result.error === "Unauthorized") {
      // Note: Keeping backward compatible format
      return NextResponse.json({ error: "unauthorized" }, { status: 403 });
    }

    if (result.error === "Project not found") {
      // Note: Contract doesn't define 404, keeping for backward compatibility
      return NextResponse.json({ error: "project_not_found" }, { status: 404 });
    }

    if (result.error === "Repository not linked to project") {
      // Note: Keeping backward compatible format
      return NextResponse.json(
        { error: "repository_not_linked" },
        { status: 400 },
      );
    }

    // Note: Contract doesn't define 500, keeping for backward compatibility
    return NextResponse.json(
      { error: "sync_failed", message: result.error },
      { status: 500 },
    );
  }

  // Note: Contract only defines filesCount, but maintaining backward compatibility
  // by returning full response format expected by tests
  return NextResponse.json({
    success: true,
    commitSha: result.commitSha,
    filesCount: result.filesCount,
    message: result.message,
  });
}
