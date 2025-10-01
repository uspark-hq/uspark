import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getUserInstallations,
  getInstallationRepositories,
  type GitHubRepository,
} from "../../../../src/lib/github/repository";

/**
 * Repository with installation info
 */
type RepositoryWithInstallation = GitHubRepository & {
  installation_id: number;
  account_name: string;
};

/**
 * GET /api/github/repositories
 *
 * Lists all GitHub repositories accessible to the authenticated user
 * across all their installations
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

  // Get all installations for this user
  const installations = await getUserInstallations(userId);

  if (installations.length === 0) {
    return NextResponse.json({
      repositories: [],
      message: "No GitHub installations found",
    });
  }

  // Fetch repositories from all installations
  const allRepositories: RepositoryWithInstallation[] = [];

  for (const installation of installations) {
    const repos = await getInstallationRepositories(
      installation.installationId,
    );

    // Add installation info to each repository
    const reposWithInstallation = repos.map((repo) => ({
      ...repo,
      installation_id: installation.installationId,
      account_name: installation.accountName,
    }));

    allRepositories.push(...reposWithInstallation);
  }

  // Sort by updated_at (most recent first), handle null values
  allRepositories.sort((a, b) => {
    const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    return bTime - aTime;
  });

  return NextResponse.json({
    repositories: allRepositories,
    total: allRepositories.length,
  });
}
