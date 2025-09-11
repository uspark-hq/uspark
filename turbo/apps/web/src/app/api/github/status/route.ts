import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getGitHubUserInfo } from "@/lib/github/client";

export async function GET() {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const githubInfo = await getGitHubUserInfo(userId);
  
  return NextResponse.json({
    connected: !!githubInfo,
    githubUsername: githubInfo?.githubUsername,
    connectedAt: githubInfo?.connectedAt,
    lastSyncedAt: githubInfo?.lastSyncedAt,
  });
}