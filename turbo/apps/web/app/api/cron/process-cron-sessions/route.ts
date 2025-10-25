import { NextRequest, NextResponse } from "next/server";
import { initServices } from "../../../../src/lib/init-services";
import { SESSIONS_TBL, TURNS_TBL } from "../../../../src/db/schema/sessions";
import { PROJECTS_TBL } from "../../../../src/db/schema/projects";
import { eq, and, desc, gt, asc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { ClaudeExecutor } from "../../../../src/lib/claude-executor";
import * as Y from "yjs";
import type { YjsFileNode, YjsBlobInfo } from "@uspark/core";
import { getStoreIdFromToken } from "../../../../src/lib/blob/utils";
import { env } from "../../../../src/env";

// Route segment config
export const maxDuration = 300;

// Batch size for cursor pagination
const BATCH_SIZE = 100;

interface CronResult {
  processedProjects: number;
  upsertedSessions: number;
  createdTurns: number;
  skippedProjects: {
    projectId: string;
    reason: string;
  }[];
  errors: {
    projectId: string;
    error: string;
  }[];
}

/**
 * POST /api/cron/process-cron-sessions
 * Iterates all projects, checks for cron.md, and creates/updates cron sessions
 *
 * This endpoint is triggered by Vercel Cron every 10 minutes
 */
export async function POST(request: NextRequest) {
  // Verify request is from Vercel Cron
  const authHeader = request.headers.get("authorization");
  const cronSecret = env().CRON_SECRET;

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  initServices();
  const db = globalThis.services.db;

  const result: CronResult = {
    processedProjects: 0,
    upsertedSessions: 0,
    createdTurns: 0,
    skippedProjects: [],
    errors: [],
  };

  // Use cursor-based pagination to iterate through all projects
  let cursor: string | null = null;
  let hasMore = true;
  let totalProjects = 0;

  while (hasMore) {
    // Fetch batch of projects using cursor
    const projects = await db
      .select({
        id: PROJECTS_TBL.id,
        userId: PROJECTS_TBL.userId,
        ydocData: PROJECTS_TBL.ydocData,
      })
      .from(PROJECTS_TBL)
      .where(cursor ? gt(PROJECTS_TBL.id, cursor) : undefined)
      .orderBy(asc(PROJECTS_TBL.id))
      .limit(BATCH_SIZE);

    totalProjects += projects.length;
    hasMore = projects.length === BATCH_SIZE;

    if (projects.length === 0) {
      break;
    }

    console.log(
      `Processing batch of ${projects.length} projects (total so far: ${totalProjects})`,
    );

    for (const project of projects) {
      result.processedProjects++;

      try {
        // Check if project has YJS data
        if (!project.ydocData) {
          console.log(`Skipping project ${project.id}: no YJS data`);
          result.skippedProjects.push({
            projectId: project.id,
            reason: "No YJS data",
          });
          continue;
        }

        // Parse YJS document to find cron.md
        const ydoc = new Y.Doc();
        const yjsData = Buffer.from(project.ydocData, "base64");
        Y.applyUpdate(ydoc, yjsData);

        const filesMap = ydoc.getMap<YjsFileNode>("files");
        const blobsMap = ydoc.getMap<YjsBlobInfo>("blobs");

        // Look for cron.md in the YJS filesystem
        const cronFileMetadata = filesMap.get("cron.md");

        if (!cronFileMetadata) {
          console.log(`Skipping project ${project.id}: cron.md not found`);
          result.skippedProjects.push({
            projectId: project.id,
            reason: "cron.md not found",
          });
          continue;
        }

        // Get the blob info
        const blobInfo = blobsMap.get(cronFileMetadata.hash);
        if (!blobInfo) {
          console.log(`Skipping project ${project.id}: cron.md blob not found`);
          result.skippedProjects.push({
            projectId: project.id,
            reason: "cron.md blob info not found",
          });
          continue;
        }

        // Download the cron.md content from blob storage
        const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
        if (!blobToken) {
          throw new Error("BLOB_READ_WRITE_TOKEN not configured");
        }

        // Extract store ID from token using centralized utility
        const storeId = getStoreIdFromToken(blobToken);

        // Download from blob storage
        const blobUrl = `https://${storeId}.public.blob.vercel-storage.com/projects/${project.id}/${cronFileMetadata.hash}`;
        const response = await fetch(blobUrl);

        if (!response.ok) {
          throw new Error(`Failed to download cron.md: ${response.statusText}`);
        }

        const cronPrompt = await response.text();

        if (!cronPrompt || cronPrompt.trim().length === 0) {
          console.log(`Skipping project ${project.id}: cron.md is empty`);
          result.skippedProjects.push({
            projectId: project.id,
            reason: "cron.md is empty",
          });
          continue;
        }

        // Upsert cron session: find existing or create new
        let cronSession = await db
          .select()
          .from(SESSIONS_TBL)
          .where(
            and(
              eq(SESSIONS_TBL.projectId, project.id),
              eq(SESSIONS_TBL.type, "cron"),
            ),
          )
          .limit(1)
          .then((rows) => rows[0]);

        if (!cronSession) {
          // Create new cron session
          const sessionId = `sess_${randomUUID()}`;
          const newSession = await db
            .insert(SESSIONS_TBL)
            .values({
              id: sessionId,
              projectId: project.id,
              title: "Cron Session",
              type: "cron",
            })
            .returning();

          cronSession = newSession[0];
          if (!cronSession) {
            throw new Error("Failed to create cron session");
          }

          console.log(
            `Created cron session ${sessionId} for project ${project.id}`,
          );
          result.upsertedSessions++;
        } else {
          console.log(
            `Using existing cron session ${cronSession.id} for project ${project.id}`,
          );
        }

        // Check if the last turn is still running
        const lastTurns = await db
          .select({
            id: TURNS_TBL.id,
            status: TURNS_TBL.status,
          })
          .from(TURNS_TBL)
          .where(eq(TURNS_TBL.sessionId, cronSession.id))
          .orderBy(desc(TURNS_TBL.createdAt))
          .limit(1);

        const lastTurn = lastTurns[0];

        // Skip if last turn is still running
        if (lastTurn && lastTurn.status === "running") {
          console.log(
            `Skipping project ${project.id}: last turn ${lastTurn.id} is still running`,
          );
          result.skippedProjects.push({
            projectId: project.id,
            reason: "Last turn still running",
          });
          continue;
        }

        // Create new turn with the cron prompt
        const turnId = `turn_${randomUUID()}`;
        const newTurn = await db
          .insert(TURNS_TBL)
          .values({
            id: turnId,
            sessionId: cronSession.id,
            userPrompt: cronPrompt,
            status: "running",
          })
          .returning();

        if (!newTurn[0]) {
          throw new Error("Failed to create turn");
        }

        console.log(
          `Created turn ${turnId} for project ${project.id} with prompt from cron.md`,
        );

        // Execute Claude asynchronously
        await ClaudeExecutor.execute(
          turnId,
          cronSession.id,
          project.id,
          cronPrompt,
          project.userId,
        );

        result.createdTurns++;
      } catch (error) {
        console.error(`Error processing project ${project.id}:`, error);
        result.errors.push({
          projectId: project.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Update cursor to the last project ID in this batch
    if (projects.length > 0) {
      cursor = projects[projects.length - 1]!.id;
    }
  }

  console.log(`Cron job completed: processed ${totalProjects} projects total`);
  console.log(`Results: ${JSON.stringify(result, null, 2)}`);

  return NextResponse.json({
    success: true,
    ...result,
  });
}
