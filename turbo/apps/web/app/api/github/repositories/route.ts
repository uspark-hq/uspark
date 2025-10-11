import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserRepositories } from "../../../../src/lib/github/repository";

/**
 * GET /api/github/repositories
 *
 * Lists all GitHub repositories accessible by the authenticated user
 * across all their GitHub App installations
 */
export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      {
        error: "unauthorized",
        error_description: "Authentication required",
      },
      { status: 401 },
    );
  }

  const repositories = await getUserRepositories(userId);

  return NextResponse.json({ repositories });
}
