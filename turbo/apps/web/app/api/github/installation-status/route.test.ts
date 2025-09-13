import { GET } from "./route";
import { auth } from "@clerk/nextjs/server";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Clerk auth
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

// Mock database
vi.mock("../../../../src/lib/init-services", () => ({
  initServices: vi.fn(),
}));

describe("GET /api/github/installation-status", () => {
  const mockDb = {
    select: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup global services mock
    globalThis.services = {
      db: mockDb as any,
      env: {} as any,
    };

    // Default mock for select chain
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
  });

  it("returns 401 when user is not authenticated", async () => {
    (auth as any).mockResolvedValue({ userId: null });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns null when no installation found", async () => {
    (auth as any).mockResolvedValue({ userId: "user_123" });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ installation: null });
  });

  it("returns installation details when installation exists", async () => {
    (auth as any).mockResolvedValue({ userId: "user_123" });

    const mockInstallation = {
      id: "install_123",
      userId: "user_123",
      installationId: 456789,
      accountName: "test-org",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    };

    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockInstallation]),
        }),
      }),
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.installation).toEqual({
      installationId: 456789,
      accountName: "test-org",
      accountType: "user",
      createdAt: mockInstallation.createdAt.toISOString(),
      repositorySelection: "selected",
    });
  });

  it("handles database errors gracefully", async () => {
    (auth as any).mockResolvedValue({ userId: "user_123" });

    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockRejectedValue(new Error("Database connection failed")),
        }),
      }),
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Failed to fetch installation status" });
  });
});