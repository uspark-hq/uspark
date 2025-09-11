import { Octokit } from "@octokit/rest";
import { initServices } from "@/lib/init-services";
import { GITHUB_TOKENS_TBL } from "@/db/schema/github-tokens";
import { decryptString } from "@/lib/crypto";
import { eq } from "drizzle-orm";

/**
 * Creates an authenticated Octokit client for a user
 */
export async function getGitHubClient(userId: string): Promise<Octokit | null> {
  initServices();
  const { db } = globalThis.services;
  
  const tokenRecord = await db
    .select()
    .from(GITHUB_TOKENS_TBL)
    .where(eq(GITHUB_TOKENS_TBL.userId, userId))
    .limit(1);
  
  if (!tokenRecord.length) {
    return null;
  }
  
  const accessToken = await decryptString(tokenRecord[0].encryptedAccessToken);
  
  return new Octokit({
    auth: accessToken,
  });
}

/**
 * Checks if a user has connected their GitHub account
 */
export async function hasGitHubConnection(userId: string): Promise<boolean> {
  initServices();
  const { db } = globalThis.services;
  
  const tokenRecord = await db
    .select({ id: GITHUB_TOKENS_TBL.id })
    .from(GITHUB_TOKENS_TBL)
    .where(eq(GITHUB_TOKENS_TBL.userId, userId))
    .limit(1);
  
  return tokenRecord.length > 0;
}

/**
 * Disconnects a user's GitHub account
 */
export async function disconnectGitHub(userId: string): Promise<void> {
  initServices();
  const { db } = globalThis.services;
  
  await db
    .delete(GITHUB_TOKENS_TBL)
    .where(eq(GITHUB_TOKENS_TBL.userId, userId));
}

/**
 * Gets GitHub user information for a connected account
 */
export async function getGitHubUserInfo(userId: string) {
  initServices();
  const { db } = globalThis.services;
  
  const tokenRecord = await db
    .select({
      githubUsername: GITHUB_TOKENS_TBL.githubUsername,
      githubUserId: GITHUB_TOKENS_TBL.githubUserId,
      connectedAt: GITHUB_TOKENS_TBL.createdAt,
      lastSyncedAt: GITHUB_TOKENS_TBL.lastSyncedAt,
    })
    .from(GITHUB_TOKENS_TBL)
    .where(eq(GITHUB_TOKENS_TBL.userId, userId))
    .limit(1);
  
  return tokenRecord[0] || null;
}