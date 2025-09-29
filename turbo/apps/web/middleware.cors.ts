import { NextRequest, NextResponse } from "next/server";

// Define allowed origins
const allowedOrigins = [
  // Development with Caddy proxy
  "https://app.uspark.dev:8443",
  "https://www.uspark.dev:8443",

  // Production domains
  "https://app.uspark.ai",
  "https://www.uspark.ai",
  "https://workspace.uspark.ai",
];

export function handleCors(request: NextRequest) {
  const origin = request.headers.get("origin");
  const response = NextResponse.next();

  // Check if the origin is allowed
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }

  // Handle preflight requests
  if (request.method === "OPTIONS") {
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization",
    );
    response.headers.set("Access-Control-Max-Age", "86400");
    return new NextResponse(null, { status: 200, headers: response.headers });
  }

  return response;
}
