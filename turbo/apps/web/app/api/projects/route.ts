import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "../../../src/lib/auth/get-user-id";
import * as Y from "yjs";
import { initServices } from "../../../src/lib/init-services";
import { PROJECTS_TBL } from "../../../src/db/schema/projects";
import { GITHUB_REPO_STATS_TBL } from "../../../src/db/schema/github-repo-stats";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  ListProjectsResponseSchema,
  CreateProjectRequestSchema,
  CreateProjectResponseSchema,
} from "@uspark/core";
import {
  hasInstallationAccess,
  getRepositoryDetails,
} from "../../../src/lib/github/repository";
import { InitialScanExecutor } from "../../../src/lib/initial-scan-executor";

// Route segment config - allow up to 5 minutes for initial scan execution
export const maxDuration = 300;

/**
 * Helper function to get cached repository stars
 * Checks cache first (1 hour TTL), then fetches from GitHub if needed
 */
async function getCachedRepoStars(
  repoUrl: string,
  installationId: number | null,
): Promise<number | null> {
  const db = globalThis.services.db;
  const now = new Date();
  const ONE_HOUR_MS = 60 * 60 * 1000;

  // Check cache
  const cached = await db
    .select()
    .from(GITHUB_REPO_STATS_TBL)
    .where(eq(GITHUB_REPO_STATS_TBL.repoUrl, repoUrl))
    .limit(1);

  // Return cached data if less than 1 hour old
  if (cached.length > 0 && cached[0]) {
    const cacheAge = now.getTime() - cached[0].lastFetchedAt.getTime();
    if (cacheAge < ONE_HOUR_MS) {
      return cached[0].stargazersCount;
    }
  }

  // Fetch fresh data from GitHub
  const repoDetails = await getRepositoryDetails(repoUrl, installationId);

  if (!repoDetails) {
    return null;
  }

  // Upsert into cache
  await db
    .insert(GITHUB_REPO_STATS_TBL)
    .values({
      repoUrl,
      stargazersCount: repoDetails.stargazersCount,
      forksCount: 0,
      openIssuesCount: null,
      installationId,
      lastFetchedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: GITHUB_REPO_STATS_TBL.repoUrl,
      set: {
        stargazersCount: repoDetails.stargazersCount,
        installationId,
        lastFetchedAt: now,
        updatedAt: now,
      },
    });

  return repoDetails.stargazersCount;
}

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
      source_repo_installation_id: PROJECTS_TBL.sourceRepoInstallationId,
      initial_scan_status: PROJECTS_TBL.initialScanStatus,
      initial_scan_session_id: PROJECTS_TBL.initialScanSessionId,
    })
    .from(PROJECTS_TBL)
    .where(eq(PROJECTS_TBL.userId, userId));

  // Fetch GitHub stars for projects with repositories (with caching)
  const projectsWithStars = await Promise.all(
    projectsData.map(async (project) => {
      let stargazers_count: number | null = null;

      // Only fetch stars if project has a GitHub repository
      if (project.source_repo_url) {
        stargazers_count = await getCachedRepoStars(
          project.source_repo_url,
          project.source_repo_installation_id,
        );
      }

      return {
        id: project.id,
        name: project.name,
        created_at: project.created_at.toISOString(),
        updated_at: project.updated_at.toISOString(),
        source_repo_url: project.source_repo_url,
        initial_scan_status: project.initial_scan_status,
        initial_scan_session_id: project.initial_scan_session_id,
        stargazers_count,
      };
    }),
  );

  // Validate response with schema
  const response = ListProjectsResponseSchema.parse({
    projects: projectsWithStars,
  });
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

  // Determine repository type
  let sourceRepoType: "installed" | "public" | null = null;
  if (sourceRepoUrl) {
    if (installationId) {
      // Installed repository - validate access
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
      sourceRepoType = "installed";
    } else {
      // Public repository - no installation needed
      sourceRepoType = "public";
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
        sourceRepoType: sourceRepoType,
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

  // Trigger initial scan if source repo is provided (for both installed and public repos)
  if (sourceRepoUrl) {
    await InitialScanExecutor.startScan(
      projectId,
      sourceRepoUrl,
      userId,
      installationId || null,
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
