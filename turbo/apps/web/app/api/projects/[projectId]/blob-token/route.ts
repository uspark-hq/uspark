import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "../../../../../src/lib/auth/get-user-id";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import { initServices } from "../../../../../src/lib/init-services";
import { PROJECTS_TBL } from "../../../../../src/db/schema/projects";
import { eq, and } from "drizzle-orm";
import { env } from "../../../../../src/env";
import { type BlobTokenResponse, type BlobTokenError } from "@uspark/core";

/**
 * GET /api/projects/:projectId/blob-token?hash=<file_hash>
 * Returns temporary client token for direct Vercel Blob Storage access
 * Supports both Clerk session auth and CLI token auth
 * Requires hash parameter to generate token for specific file path
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  const userId = await getUserId();

  if (!userId) {
    const error: BlobTokenError = {
      error: "unauthorized",
      error_description: "Authentication required",
    };
    return NextResponse.json(error, { status: 401 });
  }

  initServices();
  const { projectId } = await context.params;

  // Get hash parameter from query string
  const { searchParams } = new URL(request.url);
  const hash = searchParams.get('hash');

  if (!hash) {
    const error: BlobTokenError = {
      error: "missing_hash",
      error_description: "Hash parameter is required",
    };
    return NextResponse.json(error, { status: 400 });
  }

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
      error_description: "Project not found",
    };
    return NextResponse.json(error, { status: 404 });
  }

  // Generate client token for Vercel Blob access
  const readWriteToken = env().BLOB_READ_WRITE_TOKEN;
  if (!readWriteToken) {
    const error: BlobTokenError = {
      error: "blob_storage_not_configured",
      error_description: "Blob storage is not configured",
    };
    return NextResponse.json(error, { status: 500 });
  }

  // Generate client token for specific file path
  // Use exact path: projects/{projectId}/{hash}
  const filePath = `projects/${projectId}/${hash}`;
  const clientToken = await generateClientTokenFromReadWriteToken({
    token: readWriteToken,
    pathname: filePath,
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
}
