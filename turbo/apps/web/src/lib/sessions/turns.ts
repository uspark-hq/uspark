import { initServices } from "../init-services";
import { SESSIONS_TBL, TURNS_TBL } from "../../db/schema/sessions";
import { eq } from "drizzle-orm";

/**
 * Internal helper functions for managing turns
 * These are not exposed as API endpoints but used by other services
 */

export type TurnStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed"
  | "interrupted";

/**
 * Update turn status
 * Automatically manages startedAt and completedAt timestamps
 */
export async function updateTurnStatus(
  turnId: string,
  status: TurnStatus,
  errorMessage?: string,
): Promise<void> {
  initServices();

  const [turn] = await globalThis.services.db
    .select()
    .from(TURNS_TBL)
    .where(eq(TURNS_TBL.id, turnId));

  if (!turn) {
    throw new Error(`Turn not found: ${turnId}`);
  }

  const updateData: {
    status: string;
    startedAt?: Date;
    completedAt?: Date;
    errorMessage?: string | null;
  } = { status };

  // Set startedAt when transitioning to in_progress
  if (status === "in_progress" && !turn.startedAt) {
    updateData.startedAt = new Date();
  }

  // Set completedAt when transitioning to a terminal state
  if (
    (status === "completed" ||
      status === "failed" ||
      status === "interrupted") &&
    !turn.completedAt
  ) {
    updateData.completedAt = new Date();
  }

  // Set or clear error message
  if (errorMessage !== undefined) {
    updateData.errorMessage = errorMessage;
  }

  // Update turn
  await globalThis.services.db
    .update(TURNS_TBL)
    .set(updateData)
    .where(eq(TURNS_TBL.id, turnId));

  // Update session timestamp
  await globalThis.services.db
    .update(SESSIONS_TBL)
    .set({
      updatedAt: new Date(),
    })
    .where(eq(SESSIONS_TBL.id, turn.sessionId));
}

/**
 * Mark turn as started
 */
export async function startTurn(turnId: string): Promise<void> {
  await updateTurnStatus(turnId, "in_progress");
}

/**
 * Mark turn as completed
 */
export async function completeTurn(turnId: string): Promise<void> {
  await updateTurnStatus(turnId, "completed");
}

/**
 * Mark turn as failed with error message
 */
export async function failTurn(
  turnId: string,
  errorMessage: string,
): Promise<void> {
  await updateTurnStatus(turnId, "failed", errorMessage);
}

/**
 * Mark turn as interrupted
 */
export async function interruptTurn(turnId: string): Promise<void> {
  await updateTurnStatus(turnId, "interrupted");
}
