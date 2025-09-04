import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateTokenAction } from "./actions";

// Mock dependencies
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("../../../src/lib/init-services", () => ({
  initServices: vi.fn(),
}));

vi.mock("../../../src/db/schema/cli-tokens", () => ({
  CLI_TOKENS_TBL: {
    userId: "userId",
    expiresAt: "expiresAt",
    token: "token",
    name: "name",
    createdAt: "createdAt",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  and: vi.fn(),
  gt: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

const mockAuth = vi.mocked(await import("@clerk/nextjs/server")).auth;
const mockRedirect = vi.mocked(await import("next/navigation")).redirect;

// Mock global services
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockResolvedValue([]),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockResolvedValue(undefined),
};

beforeEach(() => {
  vi.clearAllMocks();
  globalThis.services = {
    db: mockDb as any,
    env: {} as any,
    pool: {} as any,
  };
});

describe("generateTokenAction", () => {
  it("should redirect to sign-in if user is not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    
    const formData = new FormData();
    formData.append("name", "Test Token");
    
    await generateTokenAction(formData);
    
    expect(mockRedirect).toHaveBeenCalledWith("/sign-in");
  });

  it("should return validation error for invalid input", async () => {
    mockAuth.mockResolvedValue({ userId: "user123" });
    
    const formData = new FormData();
    formData.append("name", ""); // Invalid: empty name
    
    const result = await generateTokenAction(formData);
    
    expect(result).toEqual({
      success: false,
      error: {
        error: "invalid_request",
        error_description: expect.stringContaining("String must contain at least 1 character(s)"),
      },
    });
  });

  it("should return error when token limit is exceeded", async () => {
    mockAuth.mockResolvedValue({ userId: "user123" });
    
    // Mock 10 existing tokens (at limit)
    mockDb.where.mockResolvedValue(new Array(10).fill({}));
    
    const formData = new FormData();
    formData.append("name", "Test Token");
    
    const result = await generateTokenAction(formData);
    
    expect(result).toEqual({
      success: false,
      error: {
        error: "token_limit_exceeded",
        error_description: "Maximum number of active tokens (10) reached. Please revoke an existing token before creating a new one.",
        max_tokens: 10,
      },
    });
  });

  it("should successfully generate token with valid input", async () => {
    mockAuth.mockResolvedValue({ userId: "user123" });
    mockDb.where.mockResolvedValue([]); // No existing tokens
    
    const formData = new FormData();
    formData.append("name", "Test Token");
    formData.append("expires_in_days", "90");
    
    const result = await generateTokenAction(formData);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.token).toMatch(/^usp_live_/);
      expect(result.data.name).toBe("Test Token");
      expect(result.data.expires_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(result.data.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
    
    expect(mockDb.insert).toHaveBeenCalled();
    expect(mockDb.values).toHaveBeenCalled();
  });

  it("should use default expiration days when not provided", async () => {
    mockAuth.mockResolvedValue({ userId: "user123" });
    mockDb.where.mockResolvedValue([]);
    
    const formData = new FormData();
    formData.append("name", "Test Token");
    // Note: not setting expires_in_days, should default to 90
    
    const result = await generateTokenAction(formData);
    
    expect(result.success).toBe(true);
    if (result.success) {
      const expiresAt = new Date(result.data.expires_at);
      const createdAt = new Date(result.data.created_at);
      const diffDays = Math.round((expiresAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(90);
    }
  });
});