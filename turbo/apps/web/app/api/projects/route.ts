import { NextRequest, NextResponse } from "next/server";
import * as Y from "yjs";
import { initServices } from "../../../src/lib/init-services";
import { PROJECTS_TBL } from "../../../src/db/schema/projects";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

/**
 * GET /api/projects
 * Returns list of user's projects
 */
export async function GET() {
  initServices();

  // For now, we'll use a hardcoded userId (no auth check)
  // In production, this should come from auth
  const userId = "test-user";

  const projects = await globalThis.services.db
    .select({
      id: PROJECTS_TBL.id,
      name: PROJECTS_TBL.id, // Using id as name for now, could add a name field later
      created_at: PROJECTS_TBL.createdAt,
      updated_at: PROJECTS_TBL.updatedAt,
    })
    .from(PROJECTS_TBL)
    .where(eq(PROJECTS_TBL.userId, userId));

  return NextResponse.json({ projects });
}

/**
 * POST /api/projects
 * Creates a new project
 */
export async function POST(request: NextRequest) {
  initServices();

  // For now, hardcoded userId
  const userId = "test-user";

  const body = await request.json();
  const { name } = body;

  if (!name || typeof name !== "string") {
    return NextResponse.json(
      { error: "Name is required and must be a string" },
      { status: 400 },
    );
  }

  // Generate project ID from name (could be improved)
  const projectId = `${name}-${randomUUID().slice(0, 8)}`;

  // Create new empty YDoc for this project
  const ydoc = new Y.Doc();
  const state = Y.encodeStateAsUpdate(ydoc);
  const base64Data = Buffer.from(state).toString("base64");

  // Insert project into database
  const [newProject] = await globalThis.services.db
    .insert(PROJECTS_TBL)
    .values({
      id: projectId,
      userId,
      ydocData: base64Data,
      version: 0,
    })
    .returning({
      id: PROJECTS_TBL.id,
      name: PROJECTS_TBL.id, // Using id as name for now
      created_at: PROJECTS_TBL.createdAt,
    });

  return NextResponse.json(newProject, { status: 201 });
}
