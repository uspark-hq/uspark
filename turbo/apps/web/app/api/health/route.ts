import { NextResponse } from "next/server";

/**
 * Health check endpoint for deployment readiness verification.
 * Used by E2E tests to ensure the application is fully deployed and ready before running tests.
 */
export async function GET() {
  return NextResponse.json({ status: "ready" }, { status: 200 });
}
