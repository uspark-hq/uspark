import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { initServices } from "../../../../src/lib/init-services";
import { githubInstallations } from "../../../../src/db/schema/github";

/**
 * Handles GitHub App installation setup callback
 * GET /api/github/setup?setup_action=install&installation_id=123
 */
export async function GET(request: NextRequest) {
  initServices();

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect("/sign-in");
  }

  const { searchParams } = new URL(request.url);
  const setupAction = searchParams.get("setup_action");
  const installationIdStr = searchParams.get("installation_id");
  const state = searchParams.get("state");

  // Verify state parameter matches current user (if provided)
  if (state && state !== userId) {
    return NextResponse.redirect(
      "/settings?github=error&message=invalid_state",
    );
  }

  switch (setupAction) {
    case "install": {
      if (!installationIdStr) {
        return NextResponse.redirect(
          "/settings?github=error&message=missing_installation_id",
        );
      }

      const installationId = parseInt(installationIdStr, 10);
      const placeholderAccountName = `installation-${installationId}`;

      try {
        // For MVP, we'll store the installation with a placeholder account name
        // In Task 4, we'll implement proper GitHub API calls to get the real account name

        // Store installation in database (idempotent operation)
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

        return NextResponse.redirect("/settings?github=connected");
      } catch (error) {
        console.error("Failed to store GitHub installation:", error);
        return NextResponse.redirect(
          "/settings?github=error&message=installation_failed",
        );
      }
    }

    case "request":
      // Organization admin needs to approve the installation
      return NextResponse.redirect("/settings?github=pending");

    case "update":
      // Installation permissions were updated
      return NextResponse.redirect("/settings?github=updated");

    default:
      return NextResponse.redirect(
        "/settings?github=error&message=unknown_action",
      );
  }
}
