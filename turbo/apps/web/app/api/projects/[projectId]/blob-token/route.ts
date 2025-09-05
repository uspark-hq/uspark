import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import { initServices } from "../../../../../src/lib/init-services";
import { PROJECTS_TBL } from "../../../../../src/db/schema/projects";
import { eq, and } from "drizzle-orm";
import { env } from "../../../../../src/env";

/**
 * GET /api/projects/:projectId/blob-token
 * Returns temporary client token for direct Vercel Blob Storage access
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  initServices();
  const { projectId } = await context.params;

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

  // Generate client token for Vercel Blob access
  const readWriteToken = env().BLOB_READ_WRITE_TOKEN;
  if (!readWriteToken) {
    return NextResponse.json(
      {
        error: "blob_storage_not_configured",
        error_description: "Blob storage is not configured",
      },
      { status: 500 },
    );
  }

  try {
    // Generate a secure client token with project-scoped permissions
    const clientToken = await generateClientTokenFromReadWriteToken({
      token: readWriteToken,
      pathname: `projects/${projectId}/*`,
      validUntil: Date.now() + 10 * 60 * 1000, // 10 minutes
      allowedContentTypes: ["text/*", "application/*", "image/*"],
    });

    // Return the client token with upload/download URLs
    const response = {
      token: clientToken,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
      uploadUrl: "https://blob.vercel-storage.com/upload",
      downloadUrlPrefix: "https://blob.vercel-storage.com/files",
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to generate client token:", error);
    return NextResponse.json(
      {
        error: "token_generation_failed",
        error_description: "Failed to generate client token",
      },
      { status: 500 },
    );
  }
}
