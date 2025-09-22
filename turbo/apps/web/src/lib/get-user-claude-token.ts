// This file will be used by E2B executor to get user's Claude OAuth token
import { initServices } from "./init-services";
import { CLAUDE_TOKENS_TBL } from "../db/schema/claude-tokens";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { getEncryptionKey } from "./claude-token-crypto";

// Internal function to decrypt tokens
function decryptClaudeToken(encryptedToken: string): string {
  const key = getEncryptionKey();
  const combined = Buffer.from(encryptedToken, "base64");
  const iv = combined.subarray(0, 16);
  const authTag = combined.subarray(16, 32);
  const encrypted = combined.subarray(32);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

/**
 * Gets the Claude OAuth token for a user
 * This is used internally by the E2B executor to set CLAUDE_CODE_OAUTH_TOKEN
 *
 * @param userId - The Clerk user ID
 * @returns The decrypted Claude OAuth token or null if not found
 */
export async function getUserClaudeToken(
  userId: string,
): Promise<string | null> {
  initServices();
  const db = globalThis.services.db;

  // Get the user's token
  const [token] = await db
    .select({
      encryptedToken: CLAUDE_TOKENS_TBL.encryptedToken,
    })
    .from(CLAUDE_TOKENS_TBL)
    .where(eq(CLAUDE_TOKENS_TBL.userId, userId))
    .limit(1);

  if (!token) {
    return null;
  }

  // Decrypt the token
  try {
    const decryptedToken = decryptClaudeToken(token.encryptedToken);

    // Update last used timestamp (fire and forget)
    db.update(CLAUDE_TOKENS_TBL)
      .set({ lastUsedAt: new Date() })
      .where(eq(CLAUDE_TOKENS_TBL.userId, userId))
      .execute()
      .catch((err) => {
        console.error("Failed to update token last used timestamp:", err);
      });

    return decryptedToken;
  } catch (error) {
    console.error("Failed to decrypt Claude token:", error);

    // Update error info (fire and forget)
    db.update(CLAUDE_TOKENS_TBL)
      .set({
        lastErrorAt: new Date(),
        lastErrorMessage:
          error instanceof Error ? error.message : "Decryption failed",
      })
      .where(eq(CLAUDE_TOKENS_TBL.userId, userId))
      .execute()
      .catch((err) => {
        console.error("Failed to update token error info:", err);
      });

    return null;
  }
}

/**
 * Check if a user has a Claude token configured
 *
 * @param userId - The Clerk user ID
 * @returns True if the user has a token
 */
export async function hasClaudeToken(userId: string): Promise<boolean> {
  initServices();
  const db = globalThis.services.db;

  const [token] = await db
    .select({ userId: CLAUDE_TOKENS_TBL.userId })
    .from(CLAUDE_TOKENS_TBL)
    .where(eq(CLAUDE_TOKENS_TBL.userId, userId))
    .limit(1);

  return !!token;
}
