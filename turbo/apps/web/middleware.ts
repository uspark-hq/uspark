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
  // Check if this might be a CLI token request BEFORE handling CORS
  const authHeader = request.headers.get("Authorization");
  const hasCliToken = authHeader && authHeader.includes("usp_live_");

  // Skip Clerk auth for CLI token requests - will be handled at API route level
  if (hasCliToken) {
    // Still need to handle CORS for CLI requests
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return handleCors(request);
    }
    return;
  }

  // Handle CORS for API routes
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return handleCors(request);
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
