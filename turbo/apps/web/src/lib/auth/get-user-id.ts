import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { initServices } from "../init-services";
import { CLI_TOKENS_TBL } from "../../db/schema/cli-tokens";
import { eq, and, gt } from "drizzle-orm";

/**
 * Get the authenticated user ID from either Clerk session or CLI token.
 * Uses AsyncLocalStorage via Next.js headers() to avoid requiring a request parameter.
 * @returns The user ID if authenticated, null otherwise
 */
export async function getUserId(): Promise<string | null> {
  // Get headers from AsyncLocalStorage
  const headersList = await headers();
  const authHeader = headersList.get("Authorization");

  if (authHeader && authHeader.startsWith("Bearer usp_live_")) {
    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Verify CLI token
    initServices();

    try {
      const now = new Date();

      // Look up the token in the database
      const [tokenRecord] = await globalThis.services.db
        .select()
        .from(CLI_TOKENS_TBL)
        .where(
          and(
            eq(CLI_TOKENS_TBL.token, token),
            gt(CLI_TOKENS_TBL.expiresAt, now),
          ),
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
    } catch (error) {
      console.error("Failed to verify CLI token:", error);
    }
  }

  // Fall back to Clerk authentication
  const { userId } = await auth();
  return userId;
}
