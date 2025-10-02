import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import type { z } from "zod";
import { initServices } from "../../../../../../../src/lib/init-services";
import {
  SESSIONS_TBL,
  TURNS_TBL,
  BLOCKS_TBL,
} from "../../../../../../../src/db/schema/sessions";
import { PROJECTS_TBL } from "../../../../../../../src/db/schema/projects";
import { eq, and, asc, gt } from "drizzle-orm";
import { projectDetailContract } from "@uspark/core";

// Extract types from contract
type SessionUpdateResponse = z.infer<
  (typeof projectDetailContract.getSessionUpdates.responses)[200]
>;

/**
 * GET /api/projects/:projectId/sessions/:sessionId/updates
 * Long poll for session updates - simplified version without version tracking
 * Just queries current state and compares with client state
 *
 * Contract: projectDetailContract.getSessionUpdates
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string; sessionId: string }> },
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      {
        error: "unauthorized",
        error_description: "Authentication required",
      },
      { status: 401 },
    );
  }

  initServices();
  const { projectId, sessionId } = await context.params;

  // Parse query parameters
  const url = new URL(request.url);

  // Client sends the last block ID they've seen
  // If empty, return all data
  const lastBlockId = url.searchParams.get("lastBlockId") || "";
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
    // Note: Contract defines "not_found", but keeping "project_not_found" for backward compatibility
    return NextResponse.json(
      { error: "project_not_found", error_description: "Project not found" },
      { status: 404 },
    );
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
    // Note: Contract defines "not_found", but keeping "session_not_found" for backward compatibility
    return NextResponse.json(
      { error: "session_not_found", error_description: "Session not found" },
      { status: 404 },
    );
  }

  // Get the timestamp of the last block the client has seen
  let lastBlockTimestamp: Date | null = null;
  if (lastBlockId) {
    const [lastBlock] = await globalThis.services.db
      .select({ createdAt: BLOCKS_TBL.createdAt })
      .from(BLOCKS_TBL)
      .where(eq(BLOCKS_TBL.id, lastBlockId))
      .limit(1);

    if (lastBlock) {
      lastBlockTimestamp = lastBlock.createdAt;
    }
  }

  // Long polling implementation
  const startTime = Date.now();
  const pollInterval = 100; // Check every 100ms
  let firstCheck = true;

  while (firstCheck || Date.now() - startTime < timeout) {
    firstCheck = false;

    // Check if there are new blocks after the last one
    let hasNewBlocks = false;
    if (lastBlockTimestamp) {
      // Check for blocks created after the last block
      const newBlocks = await globalThis.services.db
        .select({ id: BLOCKS_TBL.id })
        .from(BLOCKS_TBL)
        .innerJoin(TURNS_TBL, eq(BLOCKS_TBL.turnId, TURNS_TBL.id))
        .where(
          and(
            eq(TURNS_TBL.sessionId, sessionId),
            gt(BLOCKS_TBL.createdAt, lastBlockTimestamp),
          ),
        )
        .limit(1);

      hasNewBlocks = newBlocks.length > 0;
    } else {
      // No lastBlockId provided, check if there are any blocks at all
      const anyBlocks = await globalThis.services.db
        .select({ id: BLOCKS_TBL.id })
        .from(BLOCKS_TBL)
        .innerJoin(TURNS_TBL, eq(BLOCKS_TBL.turnId, TURNS_TBL.id))
        .where(eq(TURNS_TBL.sessionId, sessionId))
        .limit(1);

      hasNewBlocks = anyBlocks.length > 0;
    }

    // If there are new blocks, return all turns with their blocks
    if (hasNewBlocks) {
      // Get all turns for the session
      const turns = await globalThis.services.db
        .select()
        .from(TURNS_TBL)
        .where(eq(TURNS_TBL.sessionId, sessionId))
        .orderBy(asc(TURNS_TBL.createdAt));

      // Get blocks for each turn
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

      const response: SessionUpdateResponse = {
        session: {
          id: sessionId,
          updatedAt: session.updatedAt.toISOString(),
        },
        turns: turnsWithBlocks.map((t) => ({
          id: t.id,
          userPrompt: t.userPrompt,
          status: t.status as
            | "pending"
            | "in_progress"
            | "completed"
            | "failed",
          startedAt: t.startedAt ? t.startedAt.toISOString() : null,
          completedAt: t.completedAt ? t.completedAt.toISOString() : null,
          errorMessage: t.errorMessage || null,
          blocks: t.blocks.map((b) => ({
            id: b.id,
            type: b.type,
            content: b.content as Record<string, unknown>,
            sequenceNumber: b.sequenceNumber,
          })),
        })),
      };
      return NextResponse.json(response);
    }

    // Check if there are any active turns
    const activeTurns = await globalThis.services.db
      .select({ id: TURNS_TBL.id })
      .from(TURNS_TBL)
      .where(
        and(
          eq(TURNS_TBL.sessionId, sessionId),
          eq(TURNS_TBL.status, "in_progress"),
        ),
      )
      .limit(1);

    const hasActiveTurns = activeTurns.length > 0;

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
