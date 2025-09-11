import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { initServices } from "../../../../src/lib/init-services";

/**
 * Handles GitHub App installation setup callback
 * GET /api/github/setup?setup_action=install&installation_id=123
 *
 * This endpoint only handles redirects - no side effects.
 * The actual installation data is saved by the frontend via POST /api/github/installation
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

      // Redirect to settings with installation data - let frontend handle the POST
      const params = new URLSearchParams({
        github: "install",
        installation_id: installationIdStr,
      });

      return NextResponse.redirect(`/settings?${params.toString()}`);
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
