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
    const redirectUrl = new URL("/sign-in", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  const { searchParams } = new URL(request.url);
  const setupAction = searchParams.get("setup_action");
  const installationIdStr = searchParams.get("installation_id");
  const state = searchParams.get("state");

  // Verify state parameter matches current user (if provided)
  if (state && state !== userId) {
    const redirectUrl = new URL(
      "/settings?github=error&message=invalid_state",
      request.url,
    );
    return NextResponse.redirect(redirectUrl);
  }

  switch (setupAction) {
    case "install": {
      if (!installationIdStr) {
        const redirectUrl = new URL(
          "/settings?github=error&message=missing_installation_id",
          request.url,
        );
        return NextResponse.redirect(redirectUrl);
      }

      const installationId = parseInt(installationIdStr, 10);
      const placeholderAccountName = `installation-${installationId}`;

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

      const successUrl = new URL("/settings?github=connected", request.url);
      return NextResponse.redirect(successUrl);
    }

    case "request": {
      // Organization admin needs to approve the installation
      const pendingUrl = new URL("/settings?github=pending", request.url);
      return NextResponse.redirect(pendingUrl);
    }

    case "update": {
      // Installation permissions were updated
      const updatedUrl = new URL("/settings?github=updated", request.url);
      return NextResponse.redirect(updatedUrl);
    }

    default: {
      const errorUrl = new URL(
        "/settings?github=error&message=unknown_action",
        request.url,
      );
      return NextResponse.redirect(errorUrl);
    }
  }
}
