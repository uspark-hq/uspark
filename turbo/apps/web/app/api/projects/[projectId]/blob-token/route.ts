import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import { initServices } from "../../../../../src/lib/init-services";
import { PROJECTS_TBL } from "../../../../../src/db/schema/projects";
import { eq, and } from "drizzle-orm";
import { env } from "../../../../../src/env";
import {
  type BlobTokenResponse,
  type BlobTokenError,
} from "@uspark/core";

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
    const error: BlobTokenError = {
      error: "unauthorized",
      error_description: "Authentication required"
    };
    return NextResponse.json(error, { status: 401 });
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
    const error: BlobTokenError = {
      error: "project_not_found",
      error_description: "Project not found"
    };
    return NextResponse.json(error, { status: 404 });
  }

  // Generate client token for Vercel Blob access
  const readWriteToken = env().BLOB_READ_WRITE_TOKEN;
  if (!readWriteToken) {
    const error: BlobTokenError = {
      error: "blob_storage_not_configured",
      error_description: "Blob storage is not configured"
    };
    return NextResponse.json(error, { status: 500 });
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
    const response: BlobTokenResponse = {
      token: clientToken,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
      uploadUrl: "https://blob.vercel-storage.com/upload",
      downloadUrlPrefix: "https://blob.vercel-storage.com/files",
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to generate client token:", error);
    const errorResponse: BlobTokenError = {
      error: "token_generation_failed",
      error_description: "Failed to generate client token"
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
