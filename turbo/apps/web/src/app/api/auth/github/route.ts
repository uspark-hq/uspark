import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { env } from "@/env";

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const environment = env();
  
  if (!environment.GITHUB_CLIENT_ID) {
    return NextResponse.json(
      { error: "GitHub integration not configured" },
      { status: 500 }
    );
  }

  const state = Buffer.from(
    JSON.stringify({
      userId,
      timestamp: Date.now(),
      csrf: crypto.randomUUID(),
    })
  ).toString("base64url");

  const params = new URLSearchParams({
    client_id: environment.GITHUB_CLIENT_ID,
    scope: "repo write:repo_hook read:user user:email",
    state,
    redirect_uri: `${environment.APP_URL}/api/auth/github/callback`,
  });

  const authUrl = `https://github.com/login/oauth/authorize?${params}`;
  
  return NextResponse.redirect(authUrl);
}