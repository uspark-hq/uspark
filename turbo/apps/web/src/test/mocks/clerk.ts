import { vi } from "vitest";

/**
 * Centralized Clerk authentication mock for tests
 * This provides a consistent way to mock Clerk auth across all tests
 */

export interface MockAuthOptions {
  userId?: string | null;
  sessionId?: string | null;
  orgId?: string | null;
  orgRole?: string | null;
  orgSlug?: string | null;
}

/**
 * Creates a mock auth function with the specified options
 */
export function createMockAuth(options: MockAuthOptions = {}) {
  const {
    userId = "test-user",
    sessionId = "test-session",
    orgId = null,
    orgRole = null,
    orgSlug = null,
  } = options;

  return vi.fn().mockResolvedValue({
    userId,
    sessionId,
    orgId,
    orgRole,
    orgSlug,
    // Add common methods that might be used
    redirectToSignIn: vi.fn(),
  });
}

/**
 * Setup Clerk mock for tests
 * Call this in beforeEach or at the top of your test file
 */
export function setupClerkMock(options?: MockAuthOptions) {
  const mockAuth = createMockAuth(options);

  vi.mock("@clerk/nextjs/server", () => ({
    auth: mockAuth,
    currentUser: vi.fn().mockResolvedValue({
      id: options?.userId || "test-user",
      emailAddresses: [{ emailAddress: "test@example.com" }],
    }),
  }));

  return mockAuth;
}

/**
 * Helper to mock an unauthenticated state
 */
export function mockUnauthenticated() {
  return createMockAuth({ userId: null, sessionId: null });
}

/**
 * Helper to mock an authenticated state with specific user
 */
export function mockAuthenticated(userId = "test-user") {
  return createMockAuth({ userId, sessionId: `session-${userId}` });
}
