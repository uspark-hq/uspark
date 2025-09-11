import { NextRequest, NextResponse } from "next/server";
import * as Y from "yjs";
import { type AccessShareError, type AccessShareResponse } from "@uspark/core";
import { initServices } from "@/lib/init-services";
import { SHARE_LINKS_TBL } from "@/db/schema/share-links";
import { PROJECTS_TBL } from "@/db/schema/projects";
import { eq } from "drizzle-orm";
import { getPublicBlobUrl } from "@/lib/blob/utils";
import { env } from "@/env";

/**
 * GET /api/share/:token
 * Public endpoint to access shared content
 * No authentication required
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  initServices();
  const { token } = await context.params;

  if (!token || typeof token !== "string") {
    const errorResponse: AccessShareError = {
      error: "share_not_found",
      error_description: "Invalid or missing token",
    };
    return NextResponse.json(errorResponse, { status: 400 });
  }

  // Find the share link
  const [shareLink] = await globalThis.services.db
    .select({
      projectId: SHARE_LINKS_TBL.projectId,
      filePath: SHARE_LINKS_TBL.filePath,
    })
    .from(SHARE_LINKS_TBL)
    .where(eq(SHARE_LINKS_TBL.token, token));

  if (!shareLink) {
    const errorResponse: AccessShareError = {
      error: "share_not_found",
    };
    return NextResponse.json(errorResponse, { status: 404 });
  }

  // Get the project data
  const [project] = await globalThis.services.db
    .select()
    .from(PROJECTS_TBL)
    .where(eq(PROJECTS_TBL.id, shareLink.projectId));

  if (!project) {
    const errorResponse: AccessShareError = {
      error: "share_not_found",
      error_description: "Associated project not found",
    };
    return NextResponse.json(errorResponse, { status: 404 });
  }

  // Decode YDoc data to extract file structure and content
  const ydoc = new Y.Doc();
  const binaryData = Buffer.from(project.ydocData, "base64");
  Y.applyUpdate(ydoc, new Uint8Array(binaryData));

  // Get the files map from YDoc
  const filesMap = ydoc.getMap("files");

  // Get the file node (contains hash and mtime)
  // For MVP, filePath is required, but schema allows NULL for future expansion
  if (!shareLink.filePath) {
    const errorResponse: AccessShareError = {
      error: "file_not_found",
      error_description: "File path not specified in share link",
    };
    return NextResponse.json(errorResponse, { status: 404 });
  }

  const fileNode = filesMap.get(shareLink.filePath) as
    | { hash: string; mtime: number }
    | undefined;

  if (!fileNode || !fileNode.hash) {
    const errorResponse: AccessShareError = {
      error: "file_not_found",
    };
    return NextResponse.json(errorResponse, { status: 404 });
  }

  // Return hash-based metadata for direct blob access with project isolation
  const blobUrl = getPublicBlobUrl(
    shareLink.projectId,
    fileNode.hash,
    env().BLOB_READ_WRITE_TOKEN,
  );

  const response: AccessShareResponse = {
    project_name: shareLink.projectId,
    file_path: shareLink.filePath, // We've already checked it's not null above
    hash: fileNode.hash,
    mtime: fileNode.mtime,
    blob_url: blobUrl,
  };

  return NextResponse.json(response, { status: 200 });
}
