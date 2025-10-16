import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { initServices } from "../../../../src/lib/init-services";
import { githubInstallations } from "../../../../src/db/schema/github";
import { eq } from "drizzle-orm";
import { type InstallationStatusResponse } from "@uspark/core/contracts/github.contract";

/**
 * Get the current user's GitHub installation status
 * GET /api/github/installation-status
 */
export async function GET() {
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
    const response: InstallationStatusResponse = { installation: null };
    return NextResponse.json(response);
  }

  const installation = installations[0]!;

  const response: InstallationStatusResponse = {
    installation: {
      installationId: installation.installationId,
      accountName: installation.accountName,
      accountType: "user", // Default to user, can be enhanced later
      createdAt: installation.createdAt.toISOString(),
      repositorySelection: "selected", // Default value, can be enhanced later
    },
  };

  return NextResponse.json(response);
}
