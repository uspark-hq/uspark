import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "../../../../../../src/lib/auth/get-user-id";
import { initServices } from "../../../../../../src/lib/init-services";
import { PROJECTS_TBL } from "../../../../../../src/db/schema/projects";
import { eq, and } from "drizzle-orm";
import * as Y from "yjs";
import { env } from "../../../../../../src/env";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";

/**
 * GET /api/projects/:projectId/files/:path
 * Returns the content of a specific file from the project
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ projectId: string; path: string[] }> },
) {
  const userId = await getUserId();

  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  initServices();
  const { projectId, path } = await context.params;
  const filePath = path.join("/");

  // Verify user has access to project
  const [project] = await globalThis.services.db
    .select()
    .from(PROJECTS_TBL)
    .where(
      and(eq(PROJECTS_TBL.id, projectId), eq(PROJECTS_TBL.userId, userId)),
    );

  if (!project) {
    return NextResponse.json({ error: "project_not_found" }, { status: 404 });
  }

  // Parse the YJS document to get file metadata
  const ydocData = project.ydocData;
  if (!ydocData) {
    return NextResponse.json({ error: "no_files_in_project" }, { status: 404 });
  }

  // Decode base64 YDoc data and parse with YJS
  const binaryData = Buffer.from(ydocData, "base64");
  const ydoc = new Y.Doc();
  Y.applyUpdate(ydoc, new Uint8Array(binaryData));

  // Get the files map from YJS document
  const filesMap = ydoc.getMap("files");
  const fileNode = filesMap.get(filePath) as
    | { hash: string; mtime: number }
    | undefined;

  if (!fileNode) {
    return NextResponse.json({ error: "file_not_found" }, { status: 404 });
  }

  // First check if blob content is stored in YJS document itself
  const blobsMap = ydoc.getMap("blobs");
  const blobInfo = blobsMap.get(fileNode.hash) as
    | { content?: string }
    | undefined;

  if (blobInfo?.content) {
    // Content is stored directly in YJS
    return NextResponse.json({
      content: blobInfo.content,
      hash: fileNode.hash,
    });
  }

  // Otherwise, fetch from Vercel Blob Storage
  const readWriteToken = env().BLOB_READ_WRITE_TOKEN;
  if (!readWriteToken) {
    // Fallback to empty content if blob storage is not configured
    return NextResponse.json({ content: "", hash: fileNode.hash });
  }

  try {
    // Generate a secure client token with project-scoped permissions
    const clientToken = await generateClientTokenFromReadWriteToken({
      token: readWriteToken,
      pathname: `projects/${projectId}/*`,
      validUntil: Date.now() + 5 * 60 * 1000, // 5 minutes
      allowedContentTypes: ["text/*", "application/*"],
    });

    // Fetch blob content from Vercel Blob Storage
    const blobResponse = await fetch(
      `https://blob.vercel-storage.com/files/projects/${projectId}/${fileNode.hash}`,
      {
        headers: {
          Authorization: `Bearer ${clientToken}`,
        },
      },
    );

    if (!blobResponse.ok) {
      // Blob not found, return empty content
      console.warn(`Blob ${fileNode.hash} not found for file ${filePath}`);
      return NextResponse.json({ content: "", hash: fileNode.hash });
    }

    const content = await blobResponse.text();
    return NextResponse.json({ content, hash: fileNode.hash });
  } catch (error) {
    console.error("Error fetching file content:", error);
    return NextResponse.json({ content: "", hash: fileNode.hash });
  }
}
