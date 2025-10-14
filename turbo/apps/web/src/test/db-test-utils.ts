/**
 * Database test utilities for operations that cannot be replaced with API endpoints.
 * These utilities should ONLY be used when API endpoints are not available or suitable.
 *
 * Prefer using API endpoints over these utilities whenever possible:
 * - Use POST /api/projects instead of createTestProject()
 * - Use POST /api/projects/[id]/sessions instead of createTestSession()
 */

import { initServices } from "../lib/init-services";
import { PROJECTS_TBL } from "../db/schema/projects";
import { githubRepos, githubInstallations } from "../db/schema/github";
import { SHARE_LINKS_TBL } from "../db/schema/share-links";
import { CLI_TOKENS_TBL } from "../db/schema/cli-tokens";
import { DEVICE_CODES_TBL } from "../db/schema/device-codes";
import { inArray, eq } from "drizzle-orm";
import * as Y from "yjs";
import { randomUUID } from "crypto";

/**
 * Creates a test project for a specific user.
 * Use this ONLY when you need to create a project for a different user than the authenticated one.
 * For normal project creation, use: POST /api/projects
 */
export async function createTestProjectForUser(
  userId: string,
  options: {
    id?: string;
    name?: string;
    ydocData?: string;
    version?: number;
  } = {},
) {
  initServices();

  const projectId = options.id || randomUUID();
  const projectName = options.name || `Test Project ${projectId.slice(0, 8)}`;
  const ydoc = new Y.Doc();
  const state = Y.encodeStateAsUpdate(ydoc);
  const base64Data = options.ydocData || Buffer.from(state).toString("base64");

  const [project] = await globalThis.services.db
    .insert(PROJECTS_TBL)
    .values({
      id: projectId,
      userId,
      name: projectName,
      ydocData: base64Data,
      version: options.version ?? 0,
    })
    .returning();

  return project;
}

/**
 * Creates a GitHub installation for testing.
 * Use this ONLY for testing GitHub integration functionality.
 */
export async function createTestGitHubInstallation(
  userId: string,
  installationId: number,
  accountName: string,
) {
  initServices();

  const [installation] = await globalThis.services.db
    .insert(githubInstallations)
    .values({
      userId,
      installationId,
      accountName,
    })
    .returning();

  return installation;
}

/**
 * Links a GitHub repository to a project.
 * TODO: Replace with POST /api/projects/[projectId]/github/link when available
 */
export async function linkGitHubRepository(
  projectId: string,
  installationId: number,
  repoName: string,
  repoId: number,
) {
  initServices();

  const [repo] = await globalThis.services.db
    .insert(githubRepos)
    .values({
      projectId,
      installationId,
      repoName,
      repoId,
    })
    .returning();

  return repo;
}

/**
 * Creates a test share link for a file.
 * Use this ONLY for setting up test data when API is not suitable.
 * For normal share creation, use: POST /api/share
 */
export async function createTestShareLink(
  projectId: string,
  userId: string,
  options: {
    id?: string;
    token?: string;
    filePath?: string | null;
  } = {},
) {
  initServices();

  const [shareLink] = await globalThis.services.db
    .insert(SHARE_LINKS_TBL)
    .values({
      id: options.id || randomUUID(),
      token: options.token || randomUUID(),
      projectId,
      filePath: options.filePath ?? null,
      userId,
    })
    .returning();

  return shareLink;
}

/**
 * Creates a CLI token for testing.
 * Use this ONLY for testing token-specific functionality.
 * For normal token creation, use: POST /api/cli/auth/generate-token
 */
export async function createTestCLIToken(
  userId: string,
  options: {
    id?: string;
    token?: string;
    name?: string;
    expiresAt?: Date;
  } = {},
) {
  initServices();

  const [cliToken] = await globalThis.services.db
    .insert(CLI_TOKENS_TBL)
    .values({
      id: options.id || randomUUID(),
      userId,
      token: options.token || `usp_test_${Date.now()}`,
      name: options.name || "Test Token",
      expiresAt: options.expiresAt || new Date(Date.now() + 86400000), // 24 hours
    })
    .returning();

  return cliToken;
}

/**
 * Cleans up test data by project IDs.
 * Use this in afterEach hooks to clean up test data.
 */
export async function cleanupTestProjects(projectIds: string[]) {
  if (projectIds.length === 0) return;

  initServices();
  const db = globalThis.services.db;

  // Clean up in reverse order of foreign key dependencies
  await db
    .delete(githubRepos)
    .where(inArray(githubRepos.projectId, projectIds));
  await db
    .delete(SHARE_LINKS_TBL)
    .where(inArray(SHARE_LINKS_TBL.projectId, projectIds));
  await db.delete(PROJECTS_TBL).where(inArray(PROJECTS_TBL.id, projectIds));
}

/**
 * Updates a device code status for testing.
 * Use this ONLY for testing device code flows.
 */
export async function updateDeviceCodeStatus(
  code: string,
  status: "pending" | "authenticated" | "expired" | "denied",
  userId?: string,
) {
  initServices();
  await globalThis.services.db
    .update(DEVICE_CODES_TBL)
    .set({
      status,
      userId,
      updatedAt: new Date(),
    })
    .where(eq(DEVICE_CODES_TBL.code, code));
}
