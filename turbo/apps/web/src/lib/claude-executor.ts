import { initServices } from "./init-services";
import { TURNS_TBL } from "../db/schema/sessions";
import { eq } from "drizzle-orm";
import { E2BExecutor } from "./e2b-executor";

/**
 * Claude Executor - Handles real Claude execution via E2B
 * Replaces the mock executor with actual Claude API calls
 */

export class ClaudeExecutor {
  /**
   * Execute Claude for a turn
   */
  static async execute(
    turnId: string,
    sessionId: string,
    projectId: string,
    userPrompt: string,
    userId: string,
  ): Promise<void> {
    initServices();
    const db = globalThis.services.db;

    // Update turn status to in_progress
    await db
      .update(TURNS_TBL)
      .set({
        status: "in_progress",
        startedAt: new Date(),
      })
      .where(eq(TURNS_TBL.id, turnId));

    // Get or create sandbox for this session
    const sandbox = await E2BExecutor.getSandboxForSession(
      sessionId,
      projectId,
      userId,
    );

    // Start async execution (returns immediately)
    await E2BExecutor.executeClaude(
      sandbox,
      userPrompt,
      projectId,
      turnId,
      sessionId,
    );

    console.log(`Turn ${turnId} execution started in background`);
  }

  /**
   * Interrupt a running turn
   */
  static async interrupt(turnId: string): Promise<void> {
    initServices();
    const db = globalThis.services.db;

    // Update turn status to interrupted
    await db
      .update(TURNS_TBL)
      .set({
        status: "interrupted",
        completedAt: new Date(),
        errorMessage: "Execution interrupted by user",
      })
      .where(eq(TURNS_TBL.id, turnId));

    console.log(`Turn ${turnId} interrupted`);
  }
}
