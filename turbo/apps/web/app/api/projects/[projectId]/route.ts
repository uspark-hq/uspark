import { NextRequest, NextResponse } from "next/server";
import * as Y from "yjs";
import { initServices } from "../../../../src/lib/init-services";
import { getUserId } from "../../../../src/lib/auth/get-user-id";
import { PROJECTS_TBL } from "../../../../src/db/schema/projects";
import { PROJECT_VERSIONS_TBL } from "../../../../src/db/schema/project-versions";
import { SESSIONS_TBL } from "../../../../src/db/schema/sessions";
import { githubRepos } from "../../../../src/db/schema/github";
import { SHARE_LINKS_TBL } from "../../../../src/db/schema/share-links";
import { AGENT_SESSIONS_TBL } from "../../../../src/db/schema/agent-sessions";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

/**
 * GET /api/projects/:projectId
 * Returns the complete YDoc state as binary data
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  const userId = await getUserId();

  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  initServices();
  const { projectId } = await context.params;

  // Try to fetch existing project
  const [project] = await globalThis.services.db
    .select()
    .from(PROJECTS_TBL)
    .where(
      and(eq(PROJECTS_TBL.id, projectId), eq(PROJECTS_TBL.userId, userId)),
    );

  if (!project) {
    return NextResponse.json({ error: "project_not_found" }, { status: 404 });
  }

  // Decode base64 YDoc data and return as binary
  const binaryData = Buffer.from(project.ydocData, "base64");

  return new Response(binaryData, {
    headers: {
      "Content-Type": "application/octet-stream",
      "X-Version": project.version.toString(),
      "Access-Control-Expose-Headers": "X-Version",
    },
  });
}

/**
 * PATCH /api/projects/:projectId
 * Accepts incremental YDoc updates and applies them to the stored document
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  const userId = await getUserId();

  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  initServices();
  const { projectId } = await context.params;

  // Get the update from request body
  const updateBuffer = await request.arrayBuffer();
  const update = new Uint8Array(updateBuffer);

  // Get version from header if provided (for optimistic locking)
  const clientVersion = request.headers.get("X-Version");

  // Fetch current project
  const [project] = await globalThis.services.db
    .select()
    .from(PROJECTS_TBL)
    .where(
      and(eq(PROJECTS_TBL.id, projectId), eq(PROJECTS_TBL.userId, userId)),
    );

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Check version if provided (optimistic locking)
  if (clientVersion && parseInt(clientVersion) !== project.version) {
    return NextResponse.json(
      { error: "Version conflict", currentVersion: project.version },
      { status: 409 },
    );
  }

  // Reconstruct YDoc from stored data
  const serverDoc = new Y.Doc();
  const storedBinary = Buffer.from(project.ydocData, "base64");
  Y.applyUpdate(serverDoc, new Uint8Array(storedBinary));

  // Apply the client update
  Y.applyUpdate(serverDoc, update);

  // Serialize the updated YDoc
  const newState = Y.encodeStateAsUpdate(serverDoc);
  const newBase64Data = Buffer.from(newState).toString("base64");
  const newVersion = project.version + 1;

  // Use transaction to update both tables atomically
  const result = await globalThis.services.db.transaction(async (tx) => {
    // Update project with new version
    const [updatedProject] = await tx
      .update(PROJECTS_TBL)
      .set({
        ydocData: newBase64Data,
        version: newVersion,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(PROJECTS_TBL.id, projectId),
          eq(PROJECTS_TBL.userId, userId),
          eq(PROJECTS_TBL.version, project.version), // Optimistic locking
        ),
      )
      .returning();

    if (!updatedProject) {
      // Concurrent update happened
      return null;
    }

    // Save version snapshot for diff calculation
    await tx.insert(PROJECT_VERSIONS_TBL).values({
      id: randomUUID(),
      projectId,
      version: newVersion,
      ydocSnapshot: Buffer.from(newState),
    });

    return updatedProject;
  });

  if (!result) {
    // Concurrent update happened
    return NextResponse.json(
      { error: "Concurrent update conflict" },
      { status: 409 },
    );
  }

  return new Response("OK", {
    status: 200,
    headers: {
      "X-Version": result.version.toString(),
      "Access-Control-Expose-Headers": "X-Version",
    },
  });
}

/**
 * DELETE /api/projects/:projectId
 * Deletes a project and all related data
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  const userId = await getUserId();

  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  initServices();
  const { projectId } = await context.params;
  const db = globalThis.services.db;

  // Verify project exists and user owns it
  const [project] = await db
    .select()
    .from(PROJECTS_TBL)
    .where(
      and(eq(PROJECTS_TBL.id, projectId), eq(PROJECTS_TBL.userId, userId)),
    );

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Delete related data (order matters for foreign key constraints)
  // 1. Delete sessions (turns and blocks cascade automatically)
  await db.delete(SESSIONS_TBL).where(eq(SESSIONS_TBL.projectId, projectId));

  // 2. Delete GitHub repository links
  await db.delete(githubRepos).where(eq(githubRepos.projectId, projectId));

  // 3. Delete share links
  await db
    .delete(SHARE_LINKS_TBL)
    .where(eq(SHARE_LINKS_TBL.projectId, projectId));

  // 4. Delete agent sessions
  await db
    .delete(AGENT_SESSIONS_TBL)
    .where(eq(AGENT_SESSIONS_TBL.projectId, projectId));

  // 5. Finally, delete the project itself
  await db.delete(PROJECTS_TBL).where(eq(PROJECTS_TBL.id, projectId));

  return new Response(null, { status: 204 });
}
