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
import { hasInstallationAccess } from "../../../src/lib/github/repository";
import { InitialScanExecutor } from "../../../src/lib/initial-scan-executor";

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
      name: PROJECTS_TBL.name,
      created_at: PROJECTS_TBL.createdAt,
      updated_at: PROJECTS_TBL.updatedAt,
      source_repo_url: PROJECTS_TBL.sourceRepoUrl,
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

  const { name, sourceRepoUrl, installationId } = parseResult.data;

  // Validate installation access if source repo is provided
  if (sourceRepoUrl && installationId) {
    const hasAccess = await hasInstallationAccess(userId, installationId);
    if (!hasAccess) {
      return NextResponse.json(
        {
          error: "forbidden",
          error_description:
            "You do not have access to this GitHub installation",
        },
        { status: 403 },
      );
    }
  }

  // Generate a secure, unique project ID using UUID v4
  const projectId = randomUUID();

  // Create new empty YDoc for this project
  const ydoc = new Y.Doc();
  const state = Y.encodeStateAsUpdate(ydoc);
  const base64Data = Buffer.from(state).toString("base64");

  // Insert project into database
  let newProjectData;
  try {
    [newProjectData] = await globalThis.services.db
      .insert(PROJECTS_TBL)
      .values({
        id: projectId,
        userId,
        name,
        ydocData: base64Data,
        version: 0,
        sourceRepoUrl: sourceRepoUrl || null,
        sourceRepoInstallationId: installationId || null,
        initialScanStatus: sourceRepoUrl ? "pending" : null,
      })
      .returning({
        id: PROJECTS_TBL.id,
        name: PROJECTS_TBL.name,
        created_at: PROJECTS_TBL.createdAt,
      });
  } catch (error) {
    // Handle unique constraint violation for duplicate project names
    // Drizzle wraps PostgreSQL errors, so check both the error and its cause
    const errorMessage = error instanceof Error ? error.message : String(error);
    const causeMessage =
      error instanceof Error && error.cause ? String(error.cause) : "";

    const isUniqueConstraintError =
      errorMessage.includes("projects_user_id_name_unique") ||
      errorMessage.includes("duplicate key value") ||
      causeMessage.includes("projects_user_id_name_unique") ||
      causeMessage.includes("duplicate key value");

    if (isUniqueConstraintError) {
      return NextResponse.json(
        {
          error: "duplicate_project_name",
          error_description: `A project named "${name}" already exists. Please choose a different name.`,
        },
        { status: 400 },
      );
    }
    throw error;
  }

  if (!newProjectData) {
    throw new Error("Failed to create project");
  }

  // Trigger initial scan if source repo is provided
  if (sourceRepoUrl && installationId) {
    await InitialScanExecutor.startScan(
      projectId,
      sourceRepoUrl,
      installationId,
      userId,
    );
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
