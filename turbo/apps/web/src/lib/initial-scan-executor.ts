import { randomUUID } from "crypto";
import { initServices } from "./init-services";
import { PROJECTS_TBL } from "../db/schema/projects";
import { SESSIONS_TBL, TURNS_TBL } from "../db/schema/sessions";
import { eq, and } from "drizzle-orm";
import { ClaudeExecutor } from "./claude-executor";
import { generateInitialScanPrompt } from "./prompts/initial-scan";
import { getInstallationToken } from "./github/auth";

/**
 * Initial Scan Executor
 * Handles the initial repository scan workflow
 */

export class InitialScanExecutor {
  /**
   * Start initial scan for a project
   * Creates a special session and triggers Claude execution with GitHub access
   */
  static async startScan(
    projectId: string,
    sourceRepoUrl: string, // "owner/repo"
    userId: string,
    installationId: number | null,
  ): Promise<{ sessionId: string; turnId: string }> {
    initServices();
    const db = globalThis.services.db;

    // Parse repo URL
    const [owner, repo] = sourceRepoUrl.split("/");
    if (!owner || !repo) {
      throw new Error(`Invalid repository URL format: ${sourceRepoUrl}`);
    }

    // Create session
    const sessionId = `sess_${randomUUID()}`;
    await db.insert(SESSIONS_TBL).values({
      id: sessionId,
      projectId,
      title: "Initial Repository Scan",
      type: "initial-scan",
    });

    // Create turn with scan prompt
    const turnId = `turn_${randomUUID()}`;
    const scanPrompt = generateInitialScanPrompt(owner, repo);

    await db.insert(TURNS_TBL).values({
      id: turnId,
      sessionId,
      userPrompt: scanPrompt,
      status: "running",
    });

    // Update project status
    await db
      .update(PROJECTS_TBL)
      .set({
        initialScanStatus: "running",
        initialScanSessionId: sessionId,
      })
      .where(eq(PROJECTS_TBL.id, projectId));

    // Get GitHub token for cloning (only for installed repos)
    const extraEnvs: Record<string, string> = {};
    if (installationId) {
      const githubToken = await getInstallationToken(installationId);
      extraEnvs.GITHUB_TOKEN = githubToken;
    }

    // Execute via normal Claude executor with optional GITHUB_TOKEN
    // Fire and forget - don't wait for execution to complete
    ClaudeExecutor.execute(
      turnId,
      sessionId,
      projectId,
      scanPrompt,
      userId,
      Object.keys(extraEnvs).length > 0 ? extraEnvs : undefined,
    ).catch((err) => {
      console.error(
        `Failed to execute initial scan for project ${projectId}:`,
        err,
      );
      // Mark scan as failed
      this.markScanFailed(projectId).catch((markErr) =>
        console.error("Failed to mark scan as failed:", markErr),
      );
    });

    console.log(
      `Initial scan started for project ${projectId}, session ${sessionId}`,
    );

    return { sessionId, turnId };
  }

  /**
   * Update project status when scan completes
   */
  static async onScanComplete(
    projectId: string,
    sessionId: string,
    success: boolean,
  ): Promise<void> {
    initServices();
    const db = globalThis.services.db;

    await db
      .update(PROJECTS_TBL)
      .set({
        initialScanStatus: success ? "completed" : "failed",
      })
      .where(
        and(
          eq(PROJECTS_TBL.id, projectId),
          eq(PROJECTS_TBL.initialScanSessionId, sessionId),
        ),
      );

    console.log(
      `Initial scan ${success ? "completed" : "failed"} for project ${projectId}`,
    );
  }

  /**
   * Mark scan as failed without requiring sessionId match
   * Used when scan fails during startup before session is fully initialized
   */
  static async markScanFailed(projectId: string): Promise<void> {
    initServices();
    const db = globalThis.services.db;

    await db
      .update(PROJECTS_TBL)
      .set({
        initialScanStatus: "failed",
      })
      .where(eq(PROJECTS_TBL.id, projectId));

    console.log(`Initial scan startup failed for project ${projectId}`);
  }
}
