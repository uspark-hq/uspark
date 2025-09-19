import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { initServices } from "../../../../../../../src/lib/init-services";
import {
  SESSIONS_TBL,
  TURNS_TBL,
  BLOCKS_TBL,
} from "../../../../../../../src/db/schema/sessions";
import { PROJECTS_TBL } from "../../../../../../../src/db/schema/projects";
import { eq, and, asc, gt } from "drizzle-orm";

/**
 * GET /api/projects/:projectId/sessions/:sessionId/updates
 * Long poll for session updates with version-based tracking
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string; sessionId: string }> },
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  initServices();
  const { projectId, sessionId } = await context.params;

  // Parse query parameters
  const url = new URL(request.url);
  const clientVersion = parseInt(url.searchParams.get("version") || "0");
  const timeout = Math.min(
    parseInt(url.searchParams.get("timeout") || "30000"),
    60000, // Max 60 seconds
  );

  // Verify project exists and belongs to user
  const [project] = await globalThis.services.db
    .select()
    .from(PROJECTS_TBL)
    .where(
      and(eq(PROJECTS_TBL.id, projectId), eq(PROJECTS_TBL.userId, userId)),
    );

  if (!project) {
    return NextResponse.json({ error: "project_not_found" }, { status: 404 });
  }

  // Long polling implementation
  const startTime = Date.now();
  const pollInterval = 100; // Check every 100ms

  while (Date.now() - startTime < timeout) {
    // Get current session with version
    const [session] = await globalThis.services.db
      .select()
      .from(SESSIONS_TBL)
      .where(
        and(
          eq(SESSIONS_TBL.id, sessionId),
          eq(SESSIONS_TBL.projectId, projectId),
        ),
      );

    if (!session) {
      return NextResponse.json({ error: "session_not_found" }, { status: 404 });
    }

    // Check if there are updates
    if (session.version > clientVersion) {
      // Get all turns with updates
      const turns = await globalThis.services.db
        .select({
          id: TURNS_TBL.id,
          status: TURNS_TBL.status,
          version: TURNS_TBL.version,
          blockCount: TURNS_TBL.blockCount,
          userPrompt: TURNS_TBL.userPrompt,
          startedAt: TURNS_TBL.startedAt,
          completedAt: TURNS_TBL.completedAt,
          errorMessage: TURNS_TBL.errorMessage,
          createdAt: TURNS_TBL.createdAt,
        })
        .from(TURNS_TBL)
        .where(
          and(
            eq(TURNS_TBL.sessionId, sessionId),
            gt(TURNS_TBL.version, clientVersion),
          ),
        )
        .orderBy(asc(TURNS_TBL.createdAt));

      // Get blocks for updated turns
      const turnsWithBlocks = await Promise.all(
        turns.map(async (turn) => {
          const blocks = await globalThis.services.db
            .select()
            .from(BLOCKS_TBL)
            .where(eq(BLOCKS_TBL.turnId, turn.id))
            .orderBy(asc(BLOCKS_TBL.sequenceNumber));

          return {
            ...turn,
            blocks,
          };
        }),
      );

      // Return updates immediately
      return NextResponse.json({
        version: session.version,
        hasMore: false,
        session: {
          id: sessionId,
          version: session.version,
          updatedAt: session.updatedAt.toISOString(),
        },
        turns: turnsWithBlocks,
      });
    }

    // Check if there are any active turns
    const [activeTurn] = await globalThis.services.db
      .select({ id: TURNS_TBL.id })
      .from(TURNS_TBL)
      .where(
        and(
          eq(TURNS_TBL.sessionId, sessionId),
          eq(TURNS_TBL.status, "in_progress"),
        ),
      )
      .limit(1);

    // If no active turns and no updates, return immediately to avoid unnecessary waiting
    if (!activeTurn && session.version === clientVersion) {
      // Still check one more time before returning
      await new Promise((resolve) => setTimeout(resolve, pollInterval));

      const [finalSession] = await globalThis.services.db
        .select()
        .from(SESSIONS_TBL)
        .where(eq(SESSIONS_TBL.id, sessionId));

      if (finalSession && finalSession.version > clientVersion) {
        continue; // New update available, loop will handle it
      }

      // No updates and no active turns - return 204 No Content
      return new Response(null, {
        status: 204,
        headers: {
          "X-Session-Version": session.version.toString(),
        }
      });
    }

    // Wait before next check
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  // Timeout reached - return 204 No Content
  const [finalSession] = await globalThis.services.db
    .select({ version: SESSIONS_TBL.version })
    .from(SESSIONS_TBL)
    .where(eq(SESSIONS_TBL.id, sessionId));

  return new Response(null, {
    status: 204,
    headers: {
      "X-Session-Version": finalSession?.version?.toString() || "0",
    }
  });
}