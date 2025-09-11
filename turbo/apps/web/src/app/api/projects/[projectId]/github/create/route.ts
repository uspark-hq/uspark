import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createGitHubRepository } from "@/lib/github/repository";
import { hasGitHubConnection } from "@/lib/github/client";

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const hasConnection = await hasGitHubConnection(userId);
  
  if (!hasConnection) {
    return NextResponse.json(
      { error: "GitHub account not connected. Please connect your GitHub account first." },
      { status: 400 }
    );
  }
  
  const body = await request.json();
  const { repoName, description, isPrivate } = body;
  
  if (!repoName) {
    return NextResponse.json(
      { error: "Repository name is required" },
      { status: 400 }
    );
  }
  
  try {
    const result = await createGitHubRepository({
      userId,
      projectId: params.projectId,
      repoName,
      description,
      isPrivate: isPrivate || false,
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to create repository:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create repository" },
      { status: 500 }
    );
  }
}