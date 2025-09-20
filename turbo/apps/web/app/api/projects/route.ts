import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "../../../src/lib/auth/get-user-id";
import * as Y from "yjs";
import { initServices } from "../../../src/lib/init-services";
import { PROJECTS_TBL } from "../../../src/db/schema/projects";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  ListProjectsResponseSchema,
  CreateProjectRequestSchema,
  CreateProjectResponseSchema,
} from "@uspark/core";

/**
 * GET /api/projects
 * Returns list of user's projects
 */
export async function GET() {
  const userId = await getUserId();

  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  initServices();

  const projectsData = await globalThis.services.db
    .select({
      id: PROJECTS_TBL.id,
      name: PROJECTS_TBL.id, // Using id as name for now, could add a name field later
      created_at: PROJECTS_TBL.createdAt,
      updated_at: PROJECTS_TBL.updatedAt,
    })
    .from(PROJECTS_TBL)
    .where(eq(PROJECTS_TBL.userId, userId));

  // Convert dates to ISO strings for schema validation
  const projects = projectsData.map((project) => ({
    ...project,
    created_at: project.created_at.toISOString(),
    updated_at: project.updated_at.toISOString(),
  }));

  // Validate response with schema
  const response = ListProjectsResponseSchema.parse({ projects });
  return NextResponse.json(response);
}

/**
 * POST /api/projects
 * Creates a new project
 */
export async function POST(request: NextRequest) {
  const userId = await getUserId();

  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  initServices();

  const body = await request.json();

  // Validate request body with schema
  const parseResult = CreateProjectRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: "invalid_request",
        error_description:
          parseResult.error.issues[0]?.message || "Invalid request body",
      },
      { status: 400 },
    );
  }

  // Note: We validate the name but don't use it in the ID generation
  // The project ID is system-generated to ensure uniqueness

  // Generate a secure, unique project ID using UUID v4
  const projectId = randomUUID();

  // Create new empty YDoc for this project
  const ydoc = new Y.Doc();
  const state = Y.encodeStateAsUpdate(ydoc);
  const base64Data = Buffer.from(state).toString("base64");

  // Insert project into database
  const [newProjectData] = await globalThis.services.db
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

  if (!newProjectData) {
    throw new Error("Failed to create project");
  }

  // Convert date to ISO string for schema validation
  const newProject = {
    ...newProjectData,
    created_at: newProjectData.created_at.toISOString(),
  };

  // Validate response with schema
  const response = CreateProjectResponseSchema.parse(newProject);
  return NextResponse.json(response, { status: 201 });
}
