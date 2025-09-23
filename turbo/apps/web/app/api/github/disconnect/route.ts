import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { initServices } from "../../../../src/lib/init-services";
import {
  githubInstallations,
  githubRepos,
} from "../../../../src/db/schema/github";
import { eq } from "drizzle-orm";

/**
 * Disconnect GitHub installation for the current user
 * POST /api/github/disconnect
 */
export async function POST() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  initServices();
  const db = globalThis.services.db;

  // Find the user's GitHub installation
  const installations = await db
    .select()
    .from(githubInstallations)
    .where(eq(githubInstallations.userId, userId))
    .limit(1);

  if (installations.length === 0) {
    return NextResponse.json(
      { error: "No GitHub installation found" },
      { status: 404 },
    );
  }

  const installation = installations[0]!;

  // Delete all repositories linked to this installation
  await db
    .delete(githubRepos)
    .where(eq(githubRepos.installationId, installation.installationId));

  // Delete the installation record
  await db
    .delete(githubInstallations)
    .where(eq(githubInstallations.id, installation.id));

  return NextResponse.json({
    message: "GitHub account disconnected successfully",
  });
}
