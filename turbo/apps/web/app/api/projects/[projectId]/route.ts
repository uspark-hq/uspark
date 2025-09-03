import { NextRequest, NextResponse } from "next/server";
import * as Y from "yjs";
import { initServices } from "../../../../src/lib/init-services";
import { PROJECTS_TBL } from "../../../../src/db/schema/projects";
import { eq, and } from "drizzle-orm";

/**
 * GET /api/projects/:projectId
 * Returns the complete YDoc state as binary data
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  initServices();
  const { projectId } = await context.params;

  // For now, we'll use a hardcoded userId (no auth check)
  // In production, this should come from auth
  const userId = "test-user";

  // Try to fetch existing project
  const [project] = await globalThis.services.db
    .select()
    .from(PROJECTS_TBL)
    .where(
      and(eq(PROJECTS_TBL.id, projectId), eq(PROJECTS_TBL.userId, userId))
    );

  if (project) {
    // Decode base64 YDoc data and return as binary
    const binaryData = Buffer.from(project.ydocData, "base64");

    return new Response(binaryData, {
      headers: {
        "Content-Type": "application/octet-stream",
        "X-Version": project.version.toString(),
      },
    });
  } else {
    // Create new empty YDoc for this project
    const ydoc = new Y.Doc();
    const state = Y.encodeStateAsUpdate(ydoc);
    const base64Data = Buffer.from(state).toString("base64");

    // Store in database
    await globalThis.services.db.insert(PROJECTS_TBL).values({
      id: projectId,
      userId,
      ydocData: base64Data,
      version: 0,
    });

    return new Response(Buffer.from(state), {
      headers: {
        "Content-Type": "application/octet-stream",
        "X-Version": "0",
      },
    });
  }
}

/**
 * PATCH /api/projects/:projectId
 * Accepts incremental YDoc updates and applies them to the stored document
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  initServices();
  const { projectId } = await context.params;

  // For now, hardcoded userId
  const userId = "test-user";

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
      and(eq(PROJECTS_TBL.id, projectId), eq(PROJECTS_TBL.userId, userId))
    );

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Check version if provided (optimistic locking)
  if (clientVersion && parseInt(clientVersion) !== project.version) {
    return NextResponse.json(
      { error: "Version conflict", currentVersion: project.version },
      { status: 409 }
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

  // Update in database with version increment
  const result = await globalThis.services.db
    .update(PROJECTS_TBL)
    .set({
      ydocData: newBase64Data,
      version: project.version + 1,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(PROJECTS_TBL.id, projectId),
        eq(PROJECTS_TBL.userId, userId),
        eq(PROJECTS_TBL.version, project.version)
      )
    )
    .returning();

  if (result.length === 0) {
    // Concurrent update happened
    return NextResponse.json(
      { error: "Concurrent update conflict" },
      { status: 409 }
    );
  }

  return new Response("OK", {
    status: 200,
    headers: {
      "X-Version": result[0]?.version.toString() || "",
    },
  });
}
