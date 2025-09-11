import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { initServices } from "../../../../src/lib/init-services";
import { githubInstallations } from "../../../../src/db/schema/github";

/**
 * Handles GitHub App installation data storage
 * POST /api/github/installation
 */
export async function POST(request: NextRequest) {
  initServices();

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { installationId } = body;

    if (!installationId || typeof installationId !== "number") {
      return NextResponse.json(
        { error: "Invalid installation_id" },
        { status: 400 },
      );
    }

    // For MVP, we'll store the installation with a placeholder account name
    // In Task 4, we'll implement proper GitHub API calls to get the real account name
    const placeholderAccountName = `installation-${installationId}`;

    await globalThis.services.db
      .insert(githubInstallations)
      .values({
        userId,
        installationId,
        accountName: placeholderAccountName,
      })
      .onConflictDoUpdate({
        target: githubInstallations.installationId,
        set: {
          userId,
          accountName: placeholderAccountName,
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to store GitHub installation:", error);
    return NextResponse.json(
      { error: "Failed to store installation" },
      { status: 500 },
    );
  }
}
