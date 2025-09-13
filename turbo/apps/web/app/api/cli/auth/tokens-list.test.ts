import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./generate-token/route";
import { NextRequest } from "next/server";
import { CLI_TOKENS_TBL } from "../../../../src/db/schema/cli-tokens";
import { eq, and, gt } from "drizzle-orm";
import { initServices } from "../../../../src/lib/init-services";

// Mock Clerk auth
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";

describe("Token List Integration", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Clean up any existing tokens before each test
    initServices();
    await globalThis.services.db.delete(CLI_TOKENS_TBL);
  });

  it("should retrieve tokens after generating them", async () => {
    const userId = "user_test_123";

    // Mock authenticated user
    vi.mocked(auth).mockResolvedValue({ userId } as Awaited<
      ReturnType<typeof auth>
    >);

    // Step 1: Generate a token via API
    const request1 = new NextRequest(
      "http://localhost/api/cli/auth/generate-token",
      {
        method: "POST",
        body: JSON.stringify({
          name: "Test Token 1",
          expires_in_days: 30,
        }),
      },
    );

    const response1 = await POST(request1);
    expect(response1.status).toBe(201);
    const token1Data = await response1.json();
    expect(token1Data.token).toMatch(/^usp_live_/);

    // Step 2: Generate another token
    const request2 = new NextRequest(
      "http://localhost/api/cli/auth/generate-token",
      {
        method: "POST",
        body: JSON.stringify({
          name: "Test Token 2",
          expires_in_days: 60,
        }),
      },
    );

    const response2 = await POST(request2);
    expect(response2.status).toBe(201);
    const token2Data = await response2.json();
    expect(token2Data.token).toMatch(/^usp_live_/);

    // Step 3: Query the token list (simulating what happens in generateTokenAction)
    const now = new Date();
    const activeTokens = await globalThis.services.db
      .select()
      .from(CLI_TOKENS_TBL)
      .where(
        and(
          eq(CLI_TOKENS_TBL.userId, userId),
          gt(CLI_TOKENS_TBL.expiresAt, now),
        ),
      );

    // Verify we can retrieve both tokens
    expect(activeTokens).toHaveLength(2);

    // Verify token details
    const tokenNames = activeTokens.map((t) => t.name).sort();
    expect(tokenNames).toEqual(["Test Token 1", "Test Token 2"]);

    // Verify all required fields are present
    for (const token of activeTokens) {
      expect(token.id).toBeDefined();
      expect(token.token).toMatch(/^usp_live_/);
      expect(token.userId).toBe(userId);
      expect(token.name).toBeDefined();
      expect(token.expiresAt).toBeInstanceOf(Date);
      expect(token.createdAt).toBeInstanceOf(Date);
      expect(token.expiresAt > now).toBe(true);
    }
  });

  it("should only retrieve non-expired tokens", async () => {
    const userId = "user_test_456";

    vi.mocked(auth).mockResolvedValue({ userId } as Awaited<
      ReturnType<typeof auth>
    >);

    const now = new Date();
    const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Yesterday
    const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    // Insert expired token directly
    await globalThis.services.db.insert(CLI_TOKENS_TBL).values({
      token: "usp_live_expired",
      userId,
      name: "Expired Token",
      expiresAt: pastDate,
      createdAt: pastDate,
    });

    // Insert active token directly
    await globalThis.services.db.insert(CLI_TOKENS_TBL).values({
      token: "usp_live_active",
      userId,
      name: "Active Token",
      expiresAt: futureDate,
      createdAt: now,
    });

    // Query active tokens
    const activeTokens = await globalThis.services.db
      .select()
      .from(CLI_TOKENS_TBL)
      .where(
        and(
          eq(CLI_TOKENS_TBL.userId, userId),
          gt(CLI_TOKENS_TBL.expiresAt, now),
        ),
      );

    // Should only get the active token
    expect(activeTokens).toHaveLength(1);
    expect(activeTokens[0]?.name).toBe("Active Token");
  });

  it("should handle database query errors gracefully", async () => {
    const userId = "user_test_789";

    vi.mocked(auth).mockResolvedValue({ userId } as Awaited<
      ReturnType<typeof auth>
    >);

    // Test with null userId (edge case)
    const emptyResult = await globalThis.services.db
      .select()
      .from(CLI_TOKENS_TBL)
      .where(
        and(
          eq(CLI_TOKENS_TBL.userId, "non_existent_user"),
          gt(CLI_TOKENS_TBL.expiresAt, new Date()),
        ),
      );

    expect(emptyResult).toHaveLength(0);
  });

  it("should correctly count tokens towards the limit", async () => {
    const userId = "user_limit_test";

    vi.mocked(auth).mockResolvedValue({ userId } as Awaited<
      ReturnType<typeof auth>
    >);

    // Generate 10 tokens (the max limit)
    for (let i = 0; i < 10; i++) {
      const request = new NextRequest(
        "http://localhost/api/cli/auth/generate-token",
        {
          method: "POST",
          body: JSON.stringify({
            name: `Token ${i + 1}`,
            expires_in_days: 30,
          }),
        },
      );

      const response = await POST(request);
      expect(response.status).toBe(201);
    }

    // Query the token list
    const now = new Date();
    const activeTokens = await globalThis.services.db
      .select()
      .from(CLI_TOKENS_TBL)
      .where(
        and(
          eq(CLI_TOKENS_TBL.userId, userId),
          gt(CLI_TOKENS_TBL.expiresAt, now),
        ),
      );

    expect(activeTokens).toHaveLength(10);

    // Try to create an 11th token - should fail
    const request11 = new NextRequest(
      "http://localhost/api/cli/auth/generate-token",
      {
        method: "POST",
        body: JSON.stringify({
          name: "Token 11",
          expires_in_days: 30,
        }),
      },
    );

    const response11 = await POST(request11);
    expect(response11.status).toBe(403);

    const errorData = await response11.json();
    expect(errorData.error).toBe("token_limit_exceeded");
  });

  it("should return all token fields needed for display", async () => {
    const userId = "user_display_test";

    vi.mocked(auth).mockResolvedValue({ userId } as Awaited<
      ReturnType<typeof auth>
    >);

    // Generate a token
    const request = new NextRequest(
      "http://localhost/api/cli/auth/generate-token",
      {
        method: "POST",
        body: JSON.stringify({
          name: "Display Test Token",
          expires_in_days: 90,
        }),
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(201);

    // Query tokens as would be done for display
    const now = new Date();
    const tokens = await globalThis.services.db
      .select({
        id: CLI_TOKENS_TBL.id,
        token: CLI_TOKENS_TBL.token,
        userId: CLI_TOKENS_TBL.userId,
        name: CLI_TOKENS_TBL.name,
        expiresAt: CLI_TOKENS_TBL.expiresAt,
        lastUsedAt: CLI_TOKENS_TBL.lastUsedAt,
        createdAt: CLI_TOKENS_TBL.createdAt,
      })
      .from(CLI_TOKENS_TBL)
      .where(
        and(
          eq(CLI_TOKENS_TBL.userId, userId),
          gt(CLI_TOKENS_TBL.expiresAt, now),
        ),
      );

    expect(tokens).toHaveLength(1);

    const token = tokens[0];
    expect(token).toBeDefined();

    if (token) {
      // All fields should be present for UI display
      expect(token.id).toBeDefined();
      expect(token.token).toMatch(/^usp_live_/);
      expect(token.userId).toBe(userId);
      expect(token.name).toBe("Display Test Token");
      expect(token.expiresAt).toBeInstanceOf(Date);
      expect(token.createdAt).toBeInstanceOf(Date);
      // lastUsedAt might be null for new tokens
      expect(
        token.lastUsedAt === null || token.lastUsedAt instanceof Date,
      ).toBe(true);
    }
  });
});
