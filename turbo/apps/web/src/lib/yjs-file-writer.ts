import * as Y from "yjs";
import { createHash } from "crypto";
import { initServices } from "./init-services";
import { PROJECTS_TBL } from "../db/schema/projects";
import { eq } from "drizzle-orm";
import { put } from "@vercel/blob";

interface FileNode {
  hash: string;
  mtime: number;
}

interface BlobInfo {
  size: number;
}

/**
 * Writes a file to the YJS document and blob storage
 * @param projectId - The project ID
 * @param userId - The user ID for authorization
 * @param filePath - The path where to write the file (e.g., "README.md")
 * @param content - The file content as string
 * @returns Promise<void>
 */
export async function writeFileToYjs(
  projectId: string,
  userId: string,
  filePath: string,
  content: string,
): Promise<void> {
  initServices();

  // Fetch current project
  const [project] = await globalThis.services.db
    .select()
    .from(PROJECTS_TBL)
    .where(eq(PROJECTS_TBL.id, projectId));

  if (!project || project.userId !== userId) {
    throw new Error("Project not found or access denied");
  }

  // Load existing YJS document
  const ydoc = new Y.Doc();
  const existingData = Buffer.from(project.ydocData, "base64");
  Y.applyUpdate(ydoc, existingData);

  // Get the files and blobs maps
  const filesMap = ydoc.getMap<FileNode>("files");
  const blobsMap = ydoc.getMap<BlobInfo>("blobs");

  // Calculate content hash (consistent with CLI)
  const contentBuffer = Buffer.from(content, "utf-8");
  const hash = createHash("sha256").update(contentBuffer).digest("hex");

  // Upload content to blob storage using hash-based path
  await put(`projects/${projectId}/${hash}`, contentBuffer, {
    access: "public",
  });

  // Create file metadata
  const fileNode: FileNode = {
    hash,
    mtime: Date.now(),
  };

  // Create blob info
  const blobInfo: BlobInfo = {
    size: contentBuffer.length,
  };

  // Update YJS document
  filesMap.set(filePath, fileNode);
  blobsMap.set(hash, blobInfo);

  // Encode updated document
  const updatedState = Y.encodeStateAsUpdate(ydoc);
  const updatedBase64Data = Buffer.from(updatedState).toString("base64");

  // Save to database with version increment
  await globalThis.services.db
    .update(PROJECTS_TBL)
    .set({
      ydocData: updatedBase64Data,
      version: project.version + 1,
      updatedAt: new Date(),
    })
    .where(eq(PROJECTS_TBL.id, projectId));
}
