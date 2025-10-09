import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { handleCors } from "./middleware.cors";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/hello(.*)",
  "/api/share/(.*)",
  "/api/cli/auth/device",
  "/api/cli/auth/token",
  "/cli-auth(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  // Handle CORS preflight (OPTIONS) requests BEFORE any other processing
  // This prevents redirects from interfering with CORS preflight
  if (
    request.method === "OPTIONS" &&
    request.nextUrl.pathname.startsWith("/api/")
  ) {
    return handleCors(request);
  }

  // Handle CORS for API routes
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return handleCors(request);
  }

  // Check if this might be a CLI token request
  const authHeader = request.headers.get("Authorization");
  const hasCliToken = authHeader && authHeader.includes("usp_live_");

  // Skip Clerk auth for CLI token requests - will be handled at API route level
  if (hasCliToken) {
    return;
  }

  // For non-CLI token requests, use regular Clerk authentication
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
