import { NextRequest, NextResponse } from "next/server";
import * as Y from "yjs";
import { initServices } from "../../../../src/lib/init-services";
import { SHARE_LINKS_TBL } from "../../../../src/db/schema/share-links";
import { PROJECTS_TBL } from "../../../../src/db/schema/projects";
import { eq } from "drizzle-orm";

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
    return NextResponse.json(
      { error: "token is required and must be a string" },
      { status: 400 },
    );
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
    return NextResponse.json(
      { error: "share_not_found" },
      { status: 404 },
    );
  }

  // Get the project data
  const [project] = await globalThis.services.db
    .select()
    .from(PROJECTS_TBL)
    .where(eq(PROJECTS_TBL.id, shareLink.projectId));

  if (!project) {
    return NextResponse.json(
      { error: "project_not_found" },
      { status: 404 },
    );
  }


  // Decode YDoc data to extract file structure and content
  const ydoc = new Y.Doc();
  const binaryData = Buffer.from(project.ydocData, "base64");
  Y.applyUpdate(ydoc, new Uint8Array(binaryData));

  // Get the files and blobs maps from YDoc
  const filesMap = ydoc.getMap("files");
  const blobsMap = ydoc.getMap("blobs");
  
  // Get the file node (contains hash and mtime)
  const fileNode = filesMap.get(shareLink.filePath) as { hash: string; mtime: number } | undefined;
  
  if (!fileNode || !fileNode.hash) {
    return NextResponse.json(
      { error: "file_not_found" },
      { status: 404 },
    );
  }

  // TODO: Implement Vercel Blob integration for production
  // For MVP, we'll return an error indicating blob storage is not yet implemented
  return NextResponse.json({
    error: "blob_storage_not_implemented",
    message: "File content retrieval requires Vercel Blob integration which is not yet implemented in the backend",
    file_info: {
      project_name: shareLink.projectId,
      file_path: shareLink.filePath,
      hash: fileNode.hash,
      mtime: fileNode.mtime,
    }
  }, { status: 501 });
}