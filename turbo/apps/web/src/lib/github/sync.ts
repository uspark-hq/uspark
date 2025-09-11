import { initServices } from "@/lib/init-services";
import { GITHUB_REPOS_TBL, GITHUB_SYNC_LOG_TBL } from "@/db/schema/github-tokens";
import { eq, and, gt } from "drizzle-orm";
import { pushToGitHub } from "./repository";

interface SyncLock {
  projectId: string;
  lockedAt: Date;
  lockedBy: string;
  expiresAt: Date;
}

const syncLocks = new Map<string, SyncLock>();

/**
 * Acquires a sync lock for a project
 */
export async function acquireSyncLock(
  projectId: string,
  userId: string,
  timeoutMs: number = 30000
): Promise<boolean> {
  const now = new Date();
  const existingLock = syncLocks.get(projectId);
  
  if (existingLock && existingLock.expiresAt > now) {
    if (existingLock.lockedBy === userId) {
      existingLock.expiresAt = new Date(now.getTime() + timeoutMs);
      return true;
    }
    return false;
  }
  
  syncLocks.set(projectId, {
    projectId,
    lockedAt: now,
    lockedBy: userId,
    expiresAt: new Date(now.getTime() + timeoutMs),
  });
  
  return true;
}

/**
 * Releases a sync lock for a project
 */
export function releaseSyncLock(projectId: string, userId: string): boolean {
  const lock = syncLocks.get(projectId);
  
  if (lock && lock.lockedBy === userId) {
    syncLocks.delete(projectId);
    return true;
  }
  
  return false;
}

/**
 * Checks if there are remote changes that need to be pulled
 */
export async function checkForRemoteChanges(
  projectId: string
): Promise<boolean> {
  initServices();
  const { db } = globalThis.services;
  
  const repo = await db
    .select()
    .from(GITHUB_REPOS_TBL)
    .where(eq(GITHUB_REPOS_TBL.projectId, projectId))
    .limit(1);
  
  if (!repo.length) {
    return false;
  }
  
  const lastSync = await db
    .select()
    .from(GITHUB_SYNC_LOG_TBL)
    .where(
      and(
        eq(GITHUB_SYNC_LOG_TBL.repoId, repo[0].id),
        eq(GITHUB_SYNC_LOG_TBL.direction, "pull"),
        eq(GITHUB_SYNC_LOG_TBL.status, "success")
      )
    )
    .orderBy(GITHUB_SYNC_LOG_TBL.createdAt)
    .limit(1);
  
  if (!lastSync.length) {
    return false;
  }
  
  const pendingSyncs = await db
    .select()
    .from(GITHUB_SYNC_LOG_TBL)
    .where(
      and(
        eq(GITHUB_SYNC_LOG_TBL.repoId, repo[0].id),
        eq(GITHUB_SYNC_LOG_TBL.direction, "pull"),
        eq(GITHUB_SYNC_LOG_TBL.status, "pending"),
        gt(GITHUB_SYNC_LOG_TBL.createdAt, lastSync[0].createdAt)
      )
    )
    .limit(1);
  
  return pendingSyncs.length > 0;
}

/**
 * Syncs document changes to GitHub
 */
export async function syncToGitHub(
  userId: string,
  projectId: string,
  files: Array<{ path: string; content: string }>,
  commitMessage: string
): Promise<{ success: boolean; error?: string }> {
  const lockAcquired = await acquireSyncLock(projectId, userId);
  
  if (!lockAcquired) {
    return {
      success: false,
      error: "Another sync operation is in progress",
    };
  }
  
  try {
    const hasRemoteChanges = await checkForRemoteChanges(projectId);
    
    if (hasRemoteChanges) {
      return {
        success: false,
        error: "Remote changes detected. Please pull before pushing.",
      };
    }
    
    initServices();
    const { db } = globalThis.services;
    
    const repo = await db
      .select()
      .from(GITHUB_REPOS_TBL)
      .where(eq(GITHUB_REPOS_TBL.projectId, projectId))
      .limit(1);
    
    if (!repo.length) {
      return {
        success: false,
        error: "Repository not configured",
      };
    }
    
    const syncLogEntry = await db
      .insert(GITHUB_SYNC_LOG_TBL)
      .values({
        repoId: repo[0].id,
        direction: "push",
        status: "pending",
        filesChanged: JSON.stringify(files.map(f => f.path)),
        createdAt: new Date(),
      })
      .returning();
    
    try {
      const commitSha = await pushToGitHub(userId, projectId, files, commitMessage);
      
      await db
        .update(GITHUB_SYNC_LOG_TBL)
        .set({
          status: "success",
          commitSha,
        })
        .where(eq(GITHUB_SYNC_LOG_TBL.id, syncLogEntry[0].id));
      
      return { success: true };
    } catch (error) {
      await db
        .update(GITHUB_SYNC_LOG_TBL)
        .set({
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        })
        .where(eq(GITHUB_SYNC_LOG_TBL.id, syncLogEntry[0].id));
      
      return {
        success: false,
        error: error instanceof Error ? error.message : "Sync failed",
      };
    }
  } finally {
    releaseSyncLock(projectId, userId);
  }
}

/**
 * Gets sync status for a project
 */
export async function getSyncStatus(projectId: string) {
  initServices();
  const { db } = globalThis.services;
  
  const repo = await db
    .select()
    .from(GITHUB_REPOS_TBL)
    .where(eq(GITHUB_REPOS_TBL.projectId, projectId))
    .limit(1);
  
  if (!repo.length) {
    return {
      connected: false,
      syncing: false,
    };
  }
  
  const lock = syncLocks.get(projectId);
  const syncing = lock && lock.expiresAt > new Date();
  
  const lastSync = await db
    .select()
    .from(GITHUB_SYNC_LOG_TBL)
    .where(eq(GITHUB_SYNC_LOG_TBL.repoId, repo[0].id))
    .orderBy(GITHUB_SYNC_LOG_TBL.createdAt)
    .limit(1);
  
  return {
    connected: true,
    syncing,
    repository: repo[0].repoFullName,
    lastSync: lastSync[0] || null,
  };
}