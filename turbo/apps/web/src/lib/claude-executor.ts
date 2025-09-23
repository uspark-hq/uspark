import { initServices } from "./init-services";
import { TURNS_TBL, BLOCKS_TBL } from "../db/schema/sessions";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
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

    try {
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

      // Track sequence number for blocks
      let sequenceNumber = 0;

      // Execute Claude with real-time streaming
      const result = await E2BExecutor.executeClaude(
        sandbox,
        userPrompt,
        projectId,
        async (block) => {
          // Process each block as it arrives in real-time
          console.log(`[REAL-TIME] Block type: ${block.type}`);

          // Save different types of blocks
          if (block.type === "assistant") {
            // Assistant response block
            const message = block.message as {
              content?: Array<Record<string, unknown>>;
            };
            const content = message?.content?.[0];
            if (content?.type === "text") {
              await this.saveBlock(
                turnId,
                {
                  type: "content",
                  text: content.text as string,
                },
                sequenceNumber++,
              );
            } else if (content?.type === "tool_use") {
              await this.saveBlock(
                turnId,
                {
                  type: "tool_use",
                  tool_name: content.name as string,
                  parameters: content.input as Record<string, unknown>,
                  tool_use_id: content.id as string,
                },
                sequenceNumber++,
              );
            }
          } else if (block.type === "tool_result") {
            // Tool execution result
            await this.saveBlock(
              turnId,
              {
                type: "tool_result",
                tool_use_id: block.tool_use_id as string,
                result: block.content,
                error: block.is_error ? block.content : null,
              },
              sequenceNumber++,
            );
          } else if (block.type === "result") {
            // Final result with statistics
            await db
              .update(TURNS_TBL)
              .set({
                status: "completed",
                completedAt: new Date(),
              })
              .where(eq(TURNS_TBL.id, turnId));
          }
        },
      );

      if (!result.success) {
        throw new Error(result.error || "Claude execution failed");
      }

      console.log(
        `Turn ${turnId} completed successfully with ${sequenceNumber} blocks`,
      );
    } catch (error) {
      console.error(`Turn ${turnId} execution failed:`, error);

      // Mark turn as failed
      await db
        .update(TURNS_TBL)
        .set({
          status: "failed",
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
          completedAt: new Date(),
        })
        .where(eq(TURNS_TBL.id, turnId));

      throw error;
    }
  }

  /**
   * Save a block to the database
   */
  private static async saveBlock(
    turnId: string,
    blockData: Record<string, unknown>,
    sequenceNumber: number,
  ): Promise<void> {
    const db = globalThis.services.db;

    // Determine block type from Claude output
    let blockType: string;
    let blockContent: Record<string, unknown>;

    if (blockData.type === "thinking") {
      blockType = "thinking";
      blockContent = { text: blockData.content || blockData.text };
    } else if (blockData.type === "content" || blockData.type === "text") {
      blockType = "content";
      blockContent = { text: blockData.content || blockData.text };
    } else if (blockData.type === "tool_use") {
      blockType = "tool_use";
      blockContent = {
        tool_name: blockData.tool_name,
        parameters: blockData.parameters || {},
        tool_use_id: blockData.tool_use_id || `tool_${randomUUID()}`,
      };
    } else if (blockData.type === "tool_result") {
      blockType = "tool_result";
      blockContent = {
        tool_use_id: blockData.tool_use_id,
        result: blockData.result || blockData.output,
        error: blockData.error || null,
      };
    } else {
      // Unknown block type, store as-is
      blockType = (blockData.type as string) || "unknown";
      blockContent = blockData;
    }

    await db.insert(BLOCKS_TBL).values({
      id: `block_${randomUUID()}`,
      turnId,
      type: blockType,
      content: blockContent,
      sequenceNumber,
    });
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
