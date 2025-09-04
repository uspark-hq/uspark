import { NextRequest, NextResponse } from "next/server";
import { initServices } from "../../../../../src/lib/init-services";
import { PROJECTS_TBL } from "../../../../../src/db/schema/projects";
import { eq, and } from "drizzle-orm";

/**
 * GET /api/projects/:projectId/blob-token
 * Returns temporary STS token for direct Vercel Blob Storage access
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  initServices();
  const { projectId } = await context.params;

  // For MVP, using hardcoded userId
  const userId = "test-user";

  // Verify user has access to project
  const [project] = await globalThis.services.db
    .select()
    .from(PROJECTS_TBL)
    .where(
      and(eq(PROJECTS_TBL.id, projectId), eq(PROJECTS_TBL.userId, userId)),
    );

  if (!project) {
    return NextResponse.json(
      { error: "project_not_found", error_description: "Project not found" },
      { status: 404 },
    );
  }

  // Generate STS token for Vercel Blob access
  // For now, return mock token data
  // TODO: Integrate with actual Vercel Blob STS token generation
  const stsToken = {
    token: `vercel_blob_rw_${projectId}_${Date.now()}`,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
    uploadUrl: process.env.VERCEL_BLOB_UPLOAD_URL || "https://blob.vercel-storage.com/upload",
    downloadUrlPrefix: process.env.VERCEL_BLOB_URL || "https://blob.vercel-storage.com/files",
  };

  return NextResponse.json(stsToken);
}