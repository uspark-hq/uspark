import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { syncToGitHub } from "@/lib/github/sync";

export async function POST(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const mockFiles = [
    {
      path: "README.md",
      content: "# Project Documentation\n\nThis is a test sync from uSpark.",
    },
    {
      path: "docs/overview.md",
      content: "# Overview\n\nProject overview document.",
    },
  ];
  
  const result = await syncToGitHub(
    userId,
    params.projectId,
    mockFiles,
    "Sync documents from uSpark"
  );
  
  if (result.success) {
    return NextResponse.json({ success: true });
  } else {
    return NextResponse.json(
      { error: result.error || "Sync failed" },
      { status: 500 }
    );
  }
}