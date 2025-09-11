import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { disconnectGitHub } from "@/lib/github/client";

export async function POST() {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  await disconnectGitHub(userId);
  
  return NextResponse.json({ success: true });
}