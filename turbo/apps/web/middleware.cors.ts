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

  // Allow same-origin API calls from any uspark.ai subdomain
  "https://uspark.ai",
];

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;

  // Check exact match
  if (allowedOrigins.includes(origin)) return true;

  // Allow any *.uspark.ai or *.uspark.dev subdomain
  const url = new URL(origin);
  return (
    url.hostname.endsWith(".uspark.ai") || url.hostname.endsWith(".uspark.dev")
  );
}

export function handleCors(request: NextRequest) {
  const origin = request.headers.get("origin");
  const response = NextResponse.next();

  // Check if the origin is allowed or if there's no origin (CLI requests)
  if (origin && isOriginAllowed(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
  } else if (!origin) {
    // Allow requests without origin (CLI, server-to-server)
    response.headers.set("Access-Control-Allow-Origin", "*");
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
