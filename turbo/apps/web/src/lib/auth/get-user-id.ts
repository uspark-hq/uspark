import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { initServices } from "../init-services";
import { CLI_TOKENS_TBL } from "../../db/schema/cli-tokens";
import { eq, and, gt } from "drizzle-orm";

/**
 * Get the authenticated user ID from either Clerk session or CLI token
 * @param request - The Next.js request object
 * @returns The user ID if authenticated, null otherwise
 */
export async function getUserId(request: NextRequest): Promise<string | null> {
  // Check for CLI token in Authorization header
  const authHeader = request.headers.get("Authorization");

  if (authHeader && authHeader.startsWith("Bearer usp_live_")) {
    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Verify CLI token
    initServices();

    const now = new Date();

    // Look up the token in the database
    const [tokenRecord] = await globalThis.services.db
      .select()
      .from(CLI_TOKENS_TBL)
      .where(
        and(eq(CLI_TOKENS_TBL.token, token), gt(CLI_TOKENS_TBL.expiresAt, now)),
      )
      .limit(1);

    if (tokenRecord) {
      // Update last used timestamp
      await globalThis.services.db
        .update(CLI_TOKENS_TBL)
        .set({ lastUsedAt: now })
        .where(eq(CLI_TOKENS_TBL.token, token))
        .catch(console.error); // Non-critical update

      return tokenRecord.userId;
    }
  }

  // Fall back to Clerk authentication
  const { userId } = await auth();
  return userId;
}
