import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { env } from "@/env";
import { initServices } from "@/lib/init-services";
import { GITHUB_TOKENS_TBL } from "@/db/schema/github-tokens";
import { encryptString } from "@/lib/crypto";

interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

interface GitHubUserResponse {
  id: number;
  login: string;
  email: string;
  avatar_url: string;
}

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  
  if (!code || !state) {
    return NextResponse.json(
      { error: "Missing code or state" },
      { status: 400 }
    );
  }

  try {
    const stateData = JSON.parse(Buffer.from(state, "base64url").toString());
    
    if (stateData.userId !== userId) {
      return NextResponse.json(
        { error: "State mismatch" },
        { status: 400 }
      );
    }

    const environment = env();
    
    if (!environment.GITHUB_CLIENT_ID || !environment.GITHUB_CLIENT_SECRET) {
      return NextResponse.json(
        { error: "GitHub integration not configured" },
        { status: 500 }
      );
    }

    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: environment.GITHUB_CLIENT_ID,
          client_secret: environment.GITHUB_CLIENT_SECRET,
          code,
        }),
      }
    );

    if (!tokenResponse.ok) {
      throw new Error("Failed to exchange code for token");
    }

    const tokenData: GitHubTokenResponse = await tokenResponse.json();

    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!userResponse.ok) {
      throw new Error("Failed to fetch user data");
    }

    const userData: GitHubUserResponse = await userResponse.json();

    initServices();
    const { db } = globalThis.services;
    
    const encryptedToken = await encryptString(tokenData.access_token);
    
    await db
      .insert(GITHUB_TOKENS_TBL)
      .values({
        userId,
        githubUserId: userData.id.toString(),
        githubUsername: userData.login,
        encryptedAccessToken: encryptedToken,
        scope: tokenData.scope,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: GITHUB_TOKENS_TBL.userId,
        set: {
          githubUserId: userData.id.toString(),
          githubUsername: userData.login,
          encryptedAccessToken: encryptedToken,
          scope: tokenData.scope,
          updatedAt: new Date(),
        },
      });

    return NextResponse.redirect(
      `${environment.APP_URL}/settings/integrations?github=connected`
    );
  } catch (error) {
    const environment = env();
    console.error("GitHub OAuth callback error:", error);
    return NextResponse.redirect(
      `${environment.APP_URL}/settings/integrations?error=github_connection_failed`
    );
  }
}