import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

/**
 * Middleware to handle authentication for API routes
 * Returns the authenticated user ID or an error response
 */
export async function withAuth(): Promise<{ userId: string } | NextResponse> {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return { userId };
}

/**
 * Type guard to check if the result is an error response
 */
export function isErrorResponse(
  result: { userId: string } | NextResponse,
): result is NextResponse {
  return result instanceof NextResponse;
}
