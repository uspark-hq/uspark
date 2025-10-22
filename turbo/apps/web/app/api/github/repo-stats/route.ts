import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { initServices } from "../../../../src/lib/init-services";
import { GITHUB_REPO_STATS_TBL } from "../../../../src/db/schema/github-repo-stats";
import { getRepositoryDetails } from "../../../../src/lib/github/repository";

/**
 * GET /api/github/repo-stats?repoUrl=owner/repo&installationId=123
 *
 * Fetches GitHub repository statistics with 1-hour cache
 * - If cache exists and is less than 1 hour old, return cached data
 * - Otherwise, fetch from GitHub API and update cache
 */
export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const repoUrl = searchParams.get("repoUrl");
  const installationIdStr = searchParams.get("installationId");

  if (!repoUrl) {
    return NextResponse.json(
      { error: "repoUrl parameter is required" },
      { status: 400 },
    );
  }

  const installationId = installationIdStr
    ? parseInt(installationIdStr, 10)
    : null;

  initServices();
  const db = globalThis.services.db;

  // Check cache
  const cached = await db
    .select()
    .from(GITHUB_REPO_STATS_TBL)
    .where(eq(GITHUB_REPO_STATS_TBL.repoUrl, repoUrl))
    .limit(1);

  const now = new Date();
  const ONE_HOUR_MS = 60 * 60 * 1000;

  // Return cached data if less than 1 hour old
  if (cached.length > 0 && cached[0]) {
    const cacheAge = now.getTime() - cached[0].lastFetchedAt.getTime();
    if (cacheAge < ONE_HOUR_MS) {
      return NextResponse.json({
        repoUrl: cached[0].repoUrl,
        stargazersCount: cached[0].stargazersCount,
        forksCount: cached[0].forksCount,
        openIssuesCount: cached[0].openIssuesCount,
        lastFetchedAt: cached[0].lastFetchedAt.toISOString(),
        cached: true,
      });
    }
  }

  // Fetch fresh data from GitHub
  const repoDetails = await getRepositoryDetails(repoUrl, installationId);

  if (!repoDetails) {
    return NextResponse.json(
      { error: "Repository not found or access denied" },
      { status: 404 },
    );
  }

  // Upsert into cache
  await db
    .insert(GITHUB_REPO_STATS_TBL)
    .values({
      repoUrl,
      stargazersCount: repoDetails.stargazersCount,
      forksCount: 0, // GitHub API returns forks_count, we'll add this later if needed
      openIssuesCount: null,
      installationId,
      lastFetchedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: GITHUB_REPO_STATS_TBL.repoUrl,
      set: {
        stargazersCount: repoDetails.stargazersCount,
        installationId,
        lastFetchedAt: now,
        updatedAt: now,
      },
    });

  return NextResponse.json({
    repoUrl,
    stargazersCount: repoDetails.stargazersCount,
    forksCount: 0,
    openIssuesCount: null,
    lastFetchedAt: now.toISOString(),
    cached: false,
  });
}
