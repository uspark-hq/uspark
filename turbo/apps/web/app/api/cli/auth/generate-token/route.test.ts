import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";
import {
  GenerateTokenResponseSchema,
  GenerateTokenErrorSchema,
} from "@uspark/core";
import { CLI_TOKENS_TBL } from "../../../../../src/db/schema/cli-tokens";
import { eq } from "drizzle-orm";
import { initServices } from "../../../../../src/lib/init-services";

// Mock Clerk auth
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

import { auth } from "@clerk/nextjs/server";

describe("/api/cli/auth/generate-token", () => {
  beforeEach(async () => {
    // Clean up any existing tokens before each test
    initServices();
    await globalThis.services.db.delete(CLI_TOKENS_TBL);
  });

  it("should generate a new CLI token for authenticated user", async () => {
    // Mock authenticated user
    vi.mocked(auth).mockResolvedValue({ userId: "user_123" } as Awaited<
      ReturnType<typeof auth>
    >);

    const request = new NextRequest(
      "http://localhost/api/cli/auth/generate-token",
      {
        method: "POST",
        body: JSON.stringify({
          name: "GitHub Actions CI",
          expires_in_days: 30,
        }),
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(201);

    const data = await response.json();
    const validationResult = GenerateTokenResponseSchema.safeParse(data);
    expect(validationResult.success).toBe(true);

    if (validationResult.success) {
      const validData = validationResult.data;

      // Check token format
      expect(validData.token).toMatch(/^usp_live_[A-Za-z0-9_-]+$/);
      expect(validData.name).toBe("GitHub Actions CI");

      // Check expiration is approximately 30 days from now
      const expiresAt = new Date(validData.expires_at);
      const now = new Date();
      const diffInDays =
        (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffInDays).toBeGreaterThan(29);
      expect(diffInDays).toBeLessThanOrEqual(30);
    }

    // Verify token was stored in database
    const storedTokens = await globalThis.services.db
      .select()
      .from(CLI_TOKENS_TBL)
      .where(eq(CLI_TOKENS_TBL.userId, "user_123"));

    const storedToken = storedTokens[0];
    expect(storedToken).toBeDefined();

    if (!storedToken) {
      throw new Error("Token was not stored in database");
    }

    expect(storedToken.name).toBe("GitHub Actions CI");
    expect(storedToken.token).toMatch(/^usp_live_/);
  });

  it("should use default expiration of 90 days when not specified", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user_123" } as Awaited<
      ReturnType<typeof auth>
    >);

    const request = new NextRequest(
      "http://localhost/api/cli/auth/generate-token",
      {
        method: "POST",
        body: JSON.stringify({
          name: "Default Token",
        }),
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(201);

    const data = await response.json();
    const expiresAt = new Date(data.expires_at);
    const now = new Date();
    const diffInDays =
      (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffInDays).toBeGreaterThan(89);
    expect(diffInDays).toBeLessThanOrEqual(90);
  });

  it("should return unauthorized error when user is not authenticated", async () => {
    // Mock unauthenticated user
    vi.mocked(auth).mockResolvedValue({ userId: null } as Awaited<
      ReturnType<typeof auth>
    >);

    const request = new NextRequest(
      "http://localhost/api/cli/auth/generate-token",
      {
        method: "POST",
        body: JSON.stringify({
          name: "Test Token",
          expires_in_days: 30,
        }),
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(401);

    const data = await response.json();
    const validationResult = GenerateTokenErrorSchema.safeParse(data);
    expect(validationResult.success).toBe(true);

    if (validationResult.success) {
      expect(validationResult.data.error).toBe("unauthorized");
      expect(validationResult.data.error_description).toContain(
        "Authentication required",
      );
    }
  });

  it("should enforce token limit per user", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user_123" } as Awaited<
      ReturnType<typeof auth>
    >);

    // Create 10 tokens (the max limit)
    const now = new Date();
    const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    for (let i = 0; i < 10; i++) {
      await globalThis.services.db.insert(CLI_TOKENS_TBL).values({
        token: `usp_live_existing_${i}`,
        userId: "user_123",
        name: `Existing Token ${i}`,
        expiresAt: futureDate,
        createdAt: now,
      });
    }

    // Try to create an 11th token
    const request = new NextRequest(
      "http://localhost/api/cli/auth/generate-token",
      {
        method: "POST",
        body: JSON.stringify({
          name: "One Too Many",
          expires_in_days: 30,
        }),
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(403);

    const data = await response.json();
    const validationResult = GenerateTokenErrorSchema.safeParse(data);
    expect(validationResult.success).toBe(true);

    if (validationResult.success) {
      expect(validationResult.data.error).toBe("token_limit_exceeded");
      expect(validationResult.data.error_description).toContain(
        "Maximum number of active tokens",
      );
      expect(validationResult.data.max_tokens).toBe(10);
    }
  });

  it("should not count expired tokens towards the limit", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user_123" } as Awaited<
      ReturnType<typeof auth>
    >);

    const now = new Date();
    const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Yesterday
    const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Create 5 expired tokens
    for (let i = 0; i < 5; i++) {
      await globalThis.services.db.insert(CLI_TOKENS_TBL).values({
        token: `usp_live_expired_${i}`,
        userId: "user_123",
        name: `Expired Token ${i}`,
        expiresAt: pastDate,
        createdAt: pastDate,
      });
    }

    // Create 9 active tokens
    for (let i = 0; i < 9; i++) {
      await globalThis.services.db.insert(CLI_TOKENS_TBL).values({
        token: `usp_live_active_${i}`,
        userId: "user_123",
        name: `Active Token ${i}`,
        expiresAt: futureDate,
        createdAt: now,
      });
    }

    // Should be able to create one more token (total 10 active)
    const request = new NextRequest(
      "http://localhost/api/cli/auth/generate-token",
      {
        method: "POST",
        body: JSON.stringify({
          name: "New Token",
          expires_in_days: 30,
        }),
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(201);

    // But not an 11th active token
    const request2 = new NextRequest(
      "http://localhost/api/cli/auth/generate-token",
      {
        method: "POST",
        body: JSON.stringify({
          name: "Too Many",
          expires_in_days: 30,
        }),
      },
    );

    const response2 = await POST(request2);
    expect(response2.status).toBe(403);
  });

  it("should return invalid request error for missing name", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user_123" } as Awaited<
      ReturnType<typeof auth>
    >);

    const request = new NextRequest(
      "http://localhost/api/cli/auth/generate-token",
      {
        method: "POST",
        body: JSON.stringify({
          expires_in_days: 30,
        }),
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    const validationResult = GenerateTokenErrorSchema.safeParse(data);
    expect(validationResult.success).toBe(true);

    if (validationResult.success) {
      expect(validationResult.data.error).toBe("invalid_request");
    }
  });

  it("should return invalid request error for invalid expires_in_days", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user_123" } as Awaited<
      ReturnType<typeof auth>
    >);

    const request = new NextRequest(
      "http://localhost/api/cli/auth/generate-token",
      {
        method: "POST",
        body: JSON.stringify({
          name: "Test Token",
          expires_in_days: 400, // More than 365 max
        }),
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    const validationResult = GenerateTokenErrorSchema.safeParse(data);
    expect(validationResult.success).toBe(true);

    if (validationResult.success) {
      expect(validationResult.data.error).toBe("invalid_request");
    }
  });

  it("should return invalid request error for malformed JSON", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user_123" } as Awaited<
      ReturnType<typeof auth>
    >);

    const request = new NextRequest(
      "http://localhost/api/cli/auth/generate-token",
      {
        method: "POST",
        body: "not-json",
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    const validationResult = GenerateTokenErrorSchema.safeParse(data);
    expect(validationResult.success).toBe(true);

    if (validationResult.success) {
      expect(validationResult.data.error).toBe("invalid_request");
      expect(validationResult.data.error_description).toBe(
        "Invalid JSON in request body",
      );
    }
  });

  it("should allow different users to have their own token limits", async () => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Create 10 tokens for user_123
    for (let i = 0; i < 10; i++) {
      await globalThis.services.db.insert(CLI_TOKENS_TBL).values({
        token: `usp_live_user123_${i}`,
        userId: "user_123",
        name: `User123 Token ${i}`,
        expiresAt: futureDate,
        createdAt: now,
      });
    }

    // User_456 should still be able to create tokens
    vi.mocked(auth).mockResolvedValue({ userId: "user_456" } as Awaited<
      ReturnType<typeof auth>
    >);

    const request = new NextRequest(
      "http://localhost/api/cli/auth/generate-token",
      {
        method: "POST",
        body: JSON.stringify({
          name: "User 456 Token",
          expires_in_days: 30,
        }),
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(201);

    const data = await response.json();
    expect(data.name).toBe("User 456 Token");
  });
});
