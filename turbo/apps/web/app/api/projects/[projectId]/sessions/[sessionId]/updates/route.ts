import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { initServices } from "../../../../../../../src/lib/init-services";
import {
  SESSIONS_TBL,
  TURNS_TBL,
  BLOCKS_TBL,
} from "../../../../../../../src/db/schema/sessions";
import { PROJECTS_TBL } from "../../../../../../../src/db/schema/projects";
import { eq, and, asc } from "drizzle-orm";

/**
 * GET /api/projects/:projectId/sessions/:sessionId/updates
 * Long poll for session updates - simplified version without version tracking
 * Just queries current state and compares with client state
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

  // Client sends their current state as: turn1:blockCount1,turn2:blockCount2
  // Example: "turn_abc:3,turn_def:5"
  const clientState = url.searchParams.get("state") || "";
  const timeout = Math.min(
    parseInt(url.searchParams.get("timeout") || "30000"),
    60000, // Max 60 seconds
  );

  // Parse client state into a map
  const clientTurnStates = new Map<string, number>();
  if (clientState) {
    clientState.split(",").forEach((part) => {
      const [turnId, count] = part.split(":");
      if (turnId && count) {
        clientTurnStates.set(turnId, parseInt(count, 10));
      }
    });
  }

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

  // Verify session exists
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

  // Long polling implementation
  const startTime = Date.now();
  const pollInterval = 100; // Check every 100ms
  let firstCheck = true;

  while (firstCheck || Date.now() - startTime < timeout) {
    firstCheck = false;
    // Get all turns for the session
    const turns = await globalThis.services.db
      .select()
      .from(TURNS_TBL)
      .where(eq(TURNS_TBL.sessionId, sessionId))
      .orderBy(asc(TURNS_TBL.createdAt));

    // Get blocks for each turn and check for updates
    let hasUpdates = false;
    const turnsWithBlocks = await Promise.all(
      turns.map(async (turn) => {
        const blocks = await globalThis.services.db
          .select()
          .from(BLOCKS_TBL)
          .where(eq(BLOCKS_TBL.turnId, turn.id))
          .orderBy(asc(BLOCKS_TBL.sequenceNumber));

        const currentBlockCount = blocks.length;
        const clientBlockCount = clientTurnStates.get(turn.id);

        // Check if this turn is new or has new blocks
        if (
          clientBlockCount === undefined ||
          currentBlockCount > clientBlockCount
        ) {
          hasUpdates = true;
        }

        return {
          ...turn,
          blocks,
        };
      }),
    );

    // If there are updates, return immediately
    if (hasUpdates) {
      return NextResponse.json({
        session: {
          id: sessionId,
          updatedAt: session.updatedAt.toISOString(),
        },
        turns: turnsWithBlocks,
      });
    }

    // Check if there are any active turns
    const hasActiveTurns = turns.some(
      (turn) => turn.status === "in_progress" || turn.status === "pending",
    );

    // If no active turns and no updates, return immediately to avoid unnecessary waiting
    if (!hasActiveTurns) {
      // No updates and no active turns - return 204 No Content
      return new Response(null, { status: 204 });
    }

    // Wait before next check
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  // Timeout reached - return 204 No Content
  return new Response(null, { status: 204 });
}
