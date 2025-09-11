import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSyncStatus } from "@/lib/github/sync";

export async function GET(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const status = await getSyncStatus(params.projectId);
  
  return NextResponse.json(status);
}