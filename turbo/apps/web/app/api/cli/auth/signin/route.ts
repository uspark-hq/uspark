import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/cli/auth/signin
 *
 * Exchanges a sign-in token for a session JWT
 * This endpoint is used by the CLI to authenticate with a sign-in token
 *
 * @param request - Contains the sign-in token in Authorization header
 * @returns Session JWT that can be used for subsequent API calls
 */
export async function POST(request: NextRequest) {
  // Get the sign-in token from Authorization header
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid Authorization header" },
      { status: 401 },
    );
  }

  // Sign-in token would be extracted but is not used in this implementation
  // const signInToken = authHeader.substring(7);

  try {
    // Note: The actual sign-in token verification requires using the Frontend API
    // For CLI authentication, we should use a different approach

    // Instead, let's create a JWT template for CLI authentication
    // This requires setting up a JWT template in Clerk Dashboard first

    return NextResponse.json(
      {
        message: "Sign-in token authentication is not yet fully implemented.",
        note: "Please use the web authentication flow for now.",
      },
      { status: 501 },
    );
  } catch (error) {
    console.error("Failed to process sign-in token:", error);
    return NextResponse.json(
      { error: "Invalid or expired sign-in token" },
      { status: 401 },
    );
  }
}
