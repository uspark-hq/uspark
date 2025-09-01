import { NextResponse } from "next/server";

/**
 * Health check endpoint for Render and other monitoring services
 */
export async function GET() {
  try {
    // You can add more health checks here if needed
    // For example: database connectivity, external service availability, etc.

    return NextResponse.json(
      {
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        error: "Health check failed",
      },
      { status: 503 },
    );
  }
}
