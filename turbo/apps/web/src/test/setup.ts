import "@testing-library/jest-dom/vitest";

// Verify required environment variables are set
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required for tests");
}

if (!process.env.CLERK_SECRET_KEY) {
  throw new Error(
    "CLERK_SECRET_KEY environment variable is required for tests",
  );
}

if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
  throw new Error(
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY environment variable is required for tests",
  );
}
