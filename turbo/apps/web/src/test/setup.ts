import "@testing-library/jest-dom/vitest";

// Set required environment variables for testing
process.env.CLERK_SECRET_KEY =
  process.env.CLERK_SECRET_KEY || "test_clerk_secret_key";
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "test_clerk_publishable_key";
