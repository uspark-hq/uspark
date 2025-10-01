import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import type { z } from "zod";
import { getUserInstallations } from "../../../../src/lib/github/repository";
import { projectDetailContract } from "@uspark/core";

// Extract types from contract
type GitHubInstallationsResponse = z.infer<
  (typeof projectDetailContract.listGitHubInstallations.responses)[200]
>;
type UnauthorizedResponse = z.infer<
  (typeof projectDetailContract.listGitHubInstallations.responses)[401]
>;

/**
 * GET /api/github/installations
 *
 * Lists GitHub App installations for the authenticated user
 *
 * Contract: projectDetailContract.listGitHubInstallations
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    const error: UnauthorizedResponse = {
      error: "unauthorized",
      error_description: "Authentication required",
    };
    return NextResponse.json(error, { status: 401 });
  }

  const installations = await getUserInstallations(userId);

  const response: GitHubInstallationsResponse = { installations };
  return NextResponse.json(response);
}
