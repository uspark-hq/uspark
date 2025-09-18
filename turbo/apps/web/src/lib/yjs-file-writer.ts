import * as Y from "yjs";
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

  // Upload content to blob storage
  const contentBuffer = Buffer.from(content, "utf-8");
  const blob = await put(`projects/${projectId}/${Date.now()}-${filePath.replace(/\//g, "-")}`, contentBuffer, {
    access: "public",
  });

  // Create file metadata
  const fileNode: FileNode = {
    hash: blob.url.split("/").pop() || Date.now().toString(),
    mtime: Date.now(),
  };

  // Create blob info
  const blobInfo: BlobInfo = {
    size: contentBuffer.length,
  };

  // Update YJS document
  filesMap.set(filePath, fileNode);
  blobsMap.set(fileNode.hash, blobInfo);

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

/**
 * Reads a file from the YJS document and blob storage
 * @param projectId - The project ID
 * @param userId - The user ID for authorization
 * @param filePath - The path of the file to read
 * @returns Promise<string | null> - The file content or null if not found
 */
export async function readFileFromYjs(
  projectId: string,
  userId: string,
  filePath: string,
): Promise<string | null> {
  initServices();

  // Fetch current project
  const [project] = await globalThis.services.db
    .select()
    .from(PROJECTS_TBL)
    .where(eq(PROJECTS_TBL.id, projectId));

  if (!project || project.userId !== userId) {
    throw new Error("Project not found or access denied");
  }

  // Load YJS document
  const ydoc = new Y.Doc();
  const existingData = Buffer.from(project.ydocData, "base64");
  Y.applyUpdate(ydoc, existingData);

  // Get the files map
  const filesMap = ydoc.getMap<FileNode>("files");
  const fileNode = filesMap.get(filePath);

  if (!fileNode) {
    return null;
  }

  // Fetch content from blob storage
  try {
    const response = await fetch(`https://uspark.public.blob.vercel-storage.com/projects/${projectId}/${fileNode.hash}`);
    if (!response.ok) {
      return null;
    }
    return await response.text();
  } catch (error) {
    console.error("Failed to read file from blob storage:", error);
    return null;
  }
}