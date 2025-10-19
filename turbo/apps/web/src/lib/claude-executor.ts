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
    extraEnvs?: Record<string, string>,
  ): Promise<void> {
    initServices();
    const db = globalThis.services.db;

    console.log(
      `Starting ClaudeExecutor.execute for turn ${turnId}, session ${sessionId}`,
    );

    // Turn is already set to "running" when created, no need to update
    // Just verify it's still in running state before executing
    const [turn] = await db
      .select()
      .from(TURNS_TBL)
      .where(eq(TURNS_TBL.id, turnId));

    if (!turn || turn.status !== "running") {
      console.log(
        `Turn ${turnId} is not in running state (status: ${turn?.status}), skipping execution`,
      );
      return;
    }

    console.log(
      `Turn ${turnId} status verified as running, getting sandbox...`,
    );

    // Get or create sandbox for this session (with optional extra envs)
    const { sandbox, projectId: effectiveProjectId } =
      await E2BExecutor.getSandboxForSession(
        sessionId,
        projectId,
        userId,
        extraEnvs,
      );

    console.log(
      `Got sandbox ${sandbox.sandboxId} for turn ${turnId}, starting execution...`,
    );

    // Start async execution (returns immediately)
    await E2BExecutor.executeClaude(
      sandbox,
      userPrompt,
      effectiveProjectId,
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
