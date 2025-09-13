import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { initServices } from "../../../../src/lib/init-services";
import { githubInstallations } from "../../../../src/db/schema/github";
import { eq } from "drizzle-orm";

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

  try {
    // Find the user's GitHub installation
    const installations = await db
      .select()
      .from(githubInstallations)
      .where(eq(githubInstallations.userId, userId))
      .limit(1);

    if (installations.length === 0) {
      return NextResponse.json({ installation: null });
    }

    const installation = installations[0]!;

    return NextResponse.json({
      installation: {
        installationId: installation.installationId,
        accountName: installation.accountName,
        accountType: "user", // Default to user, can be enhanced later
        createdAt: installation.createdAt,
        repositorySelection: "selected", // Default value, can be enhanced later
      },
    });
  } catch (error) {
    console.error("Error fetching installation status:", error);
    return NextResponse.json(
      { error: "Failed to fetch installation status" },
      { status: 500 },
    );
  }
}
