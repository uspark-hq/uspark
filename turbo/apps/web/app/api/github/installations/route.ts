import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import type { z } from "zod";
import { getUserInstallations } from "../../../../src/lib/github/repository";
import { projectDetailContract } from "@uspark/core";

// Extract types from contract
type GitHubInstallationsResponse = z.infer<
  (typeof projectDetailContract.listGitHubInstallations.responses)[200]
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
    return NextResponse.json(
      {
        error: "unauthorized",
        error_description: "Authentication required",
      },
      { status: 401 },
    );
  }

  const installations = await getUserInstallations(userId);

  // Transform to snake_case for API response
  const response: GitHubInstallationsResponse = {
    installations: installations.map((i) => ({
      id: i.id,
      installation_id: i.installationId,
      account_name: i.accountName,
      created_at: i.createdAt,
      updated_at: i.updatedAt,
    })),
  };

  return NextResponse.json(response);
}
