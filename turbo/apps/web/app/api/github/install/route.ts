import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { initServices } from "../../../../src/lib/init-services";

/**
 * Redirects user to GitHub to install the uSpark GitHub App
 * GET /api/github/install
 */
export async function GET() {
  initServices();

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // GitHub App installation URL - use base URL to allow org selection
  const installUrl = `https://github.com/apps/uspark-sync`;

  // Add state parameter to track the user
  const url = new URL(installUrl);
  url.searchParams.set("state", userId);

  return NextResponse.redirect(url.toString());
}
