import { NextRequest, NextResponse } from "next/server";
import * as Y from "yjs";
import { initServices } from "../../../../../src/lib/init-services";
import { SHARE_LINKS_TBL } from "../../../../../src/db/schema/share-links";
import { PROJECTS_TBL } from "../../../../../src/db/schema/projects";
import { eq } from "drizzle-orm";
import { getBlobStorageInstance } from "../../../../../src/lib/blob/storage";

/**
 * GET /api/share/:token/content
 * Public endpoint to get the actual content of a shared file
 * No authentication required - token serves as authentication
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  initServices();
  const { token } = await context.params;

  if (!token || typeof token !== "string") {
    return NextResponse.json(
      { error: "Invalid or missing token" },
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

  if (!shareLink || !shareLink.filePath) {
    return NextResponse.json({ error: "Share not found" }, { status: 404 });
  }

  // Get the project data to extract file hash
  const [project] = await globalThis.services.db
    .select()
    .from(PROJECTS_TBL)
    .where(eq(PROJECTS_TBL.id, shareLink.projectId));

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Decode YDoc to get the file hash
  const ydoc = new Y.Doc();
  const binaryData = Buffer.from(project.ydocData, "base64");
  Y.applyUpdate(ydoc, new Uint8Array(binaryData));

  const filesMap = ydoc.getMap("files");
  const fileNode = filesMap.get(shareLink.filePath) as
    | { hash: string; mtime: number }
    | undefined;

  if (!fileNode || !fileNode.hash) {
    return NextResponse.json(
      { error: "File not found in project" },
      { status: 404 },
    );
  }

  try {
    // Get the blob storage instance and download the content
    const blobStorage = getBlobStorageInstance();
    const content = await blobStorage.downloadBlob(fileNode.hash);

    // Determine content type based on file extension
    const ext = shareLink.filePath.split(".").pop()?.toLowerCase() || "";
    let contentType = "text/plain";

    if (
      ["js", "jsx", "ts", "tsx", "json", "md", "txt", "css", "html"].includes(
        ext,
      )
    ) {
      contentType = "text/plain; charset=utf-8";
    } else if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
      contentType = `image/${ext === "jpg" ? "jpeg" : ext}`;
    }

    // Convert Buffer to Uint8Array for NextResponse
    return new NextResponse(new Uint8Array(content), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error("Failed to fetch blob content:", error);
    return NextResponse.json(
      { error: "Failed to retrieve file content" },
      { status: 500 },
    );
  }
}
