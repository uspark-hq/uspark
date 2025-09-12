import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserInstallations } from "../../../../src/lib/github/repository";

/**
 * GET /api/github/installations
 * 
 * Lists GitHub App installations for the authenticated user
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  
  try {
    const installations = await getUserInstallations(userId);
    
    return NextResponse.json({ installations });
  } catch (error) {
    console.error("Error getting installations:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}