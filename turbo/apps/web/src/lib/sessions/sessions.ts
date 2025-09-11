import { initServices } from "../init-services";
import { SESSIONS_TBL } from "../../db/schema/sessions";
import { eq } from "drizzle-orm";

/**
 * Internal helper functions for managing sessions
 * These are not exposed as API endpoints but used by other services
 */

/**
 * Update session title (internal use only)
 * This is only used internally when auto-generating session titles
 */
export async function updateSessionTitle(
  sessionId: string,
  title: string | null,
): Promise<void> {
  initServices();

  const [session] = await globalThis.services.db
    .select()
    .from(SESSIONS_TBL)
    .where(eq(SESSIONS_TBL.id, sessionId));

  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  await globalThis.services.db
    .update(SESSIONS_TBL)
    .set({
      title,
      updatedAt: new Date(),
    })
    .where(eq(SESSIONS_TBL.id, sessionId));
}

/**
 * Touch session to update its timestamp
 */
export async function touchSession(sessionId: string): Promise<void> {
  initServices();

  await globalThis.services.db
    .update(SESSIONS_TBL)
    .set({
      updatedAt: new Date(),
    })
    .where(eq(SESSIONS_TBL.id, sessionId));
}