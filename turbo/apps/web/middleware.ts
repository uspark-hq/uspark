import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

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
  // Skip protection in test environment
  const isTestEnvironment = process.env.NODE_ENV === "test" ||
                            process.env.CLERK_TESTING === "true";

  // Protect all routes except public ones (skip in test environment)
  if (!isPublicRoute(request) && !isTestEnvironment) {
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
