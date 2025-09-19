import { eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  SESSIONS_TBL,
  TURNS_TBL,
  BLOCKS_TBL,
  type NewTurn,
  type NewBlock,
} from "../../db/schema/sessions";
import type { schema } from "../../db/db";

/**
 * Version manager for tracking updates to sessions and turns
 * Implements versioning for efficient long polling
 */
export class VersionManager {
  private db: NodePgDatabase<typeof schema>;

  constructor(db: NodePgDatabase<typeof schema>) {
    this.db = db;
  }

  /**
   * Increment session version when any update occurs
   */
  async incrementSessionVersion(sessionId: string): Promise<number> {
    const result = await this.db
      .update(SESSIONS_TBL)
      .set({
        version: sql`${SESSIONS_TBL.version} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(SESSIONS_TBL.id, sessionId))
      .returning({ version: SESSIONS_TBL.version });

    return result[0]?.version || 0;
  }

  /**
   * Increment turn version and session version when turn is updated
   */
  async incrementTurnVersion(turnId: string): Promise<number> {
    // Get turn to find session
    const [turn] = await this.db
      .select({ sessionId: TURNS_TBL.sessionId })
      .from(TURNS_TBL)
      .where(eq(TURNS_TBL.id, turnId));

    if (!turn) {
      throw new Error("Turn not found");
    }

    // Update turn version
    const [updatedTurn] = await this.db
      .update(TURNS_TBL)
      .set({
        version: sql`${TURNS_TBL.version} + 1`,
      })
      .where(eq(TURNS_TBL.id, turnId))
      .returning({ version: TURNS_TBL.version });

    // Also increment session version
    await this.incrementSessionVersion(turn.sessionId);

    return updatedTurn?.version || 0;
  }

  /**
   * Create a new turn with versioning
   */
  async createTurn(turn: NewTurn): Promise<string> {
    // Get current session version
    const [session] = await this.db
      .select({ version: SESSIONS_TBL.version })
      .from(SESSIONS_TBL)
      .where(eq(SESSIONS_TBL.id, turn.sessionId));

    const sessionVersion = session?.version || 0;

    // Create turn with initial version
    const [newTurn] = await this.db
      .insert(TURNS_TBL)
      .values({
        ...turn,
        version: sessionVersion + 1,
      })
      .returning({ id: TURNS_TBL.id });

    // Increment session version
    await this.incrementSessionVersion(turn.sessionId);

    if (!newTurn) {
      throw new Error("Failed to create turn");
    }

    return newTurn.id;
  }

  /**
   * Add a block to a turn and update versions
   */
  async addBlock(block: NewBlock): Promise<void> {
    // Insert block
    await this.db.insert(BLOCKS_TBL).values(block);

    // Update turn's block count
    await this.db
      .update(TURNS_TBL)
      .set({
        blockCount: sql`${TURNS_TBL.blockCount} + 1`,
      })
      .where(eq(TURNS_TBL.id, block.turnId));

    // Increment versions
    await this.incrementTurnVersion(block.turnId);
  }

  /**
   * Update turn status with version increment
   */
  async updateTurnStatus(
    turnId: string,
    status: string,
    additionalFields?: {
      startedAt?: Date;
      completedAt?: Date;
      errorMessage?: string;
    },
  ): Promise<void> {
    await this.db
      .update(TURNS_TBL)
      .set({
        status,
        ...additionalFields,
      })
      .where(eq(TURNS_TBL.id, turnId));

    // Increment versions
    await this.incrementTurnVersion(turnId);
  }

  /**
   * Get session with current version
   */
  async getSessionVersion(sessionId: string): Promise<number> {
    const [session] = await this.db
      .select({ version: SESSIONS_TBL.version })
      .from(SESSIONS_TBL)
      .where(eq(SESSIONS_TBL.id, sessionId));

    return session?.version || 0;
  }
}