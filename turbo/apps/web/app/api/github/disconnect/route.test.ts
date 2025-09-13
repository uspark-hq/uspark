import { POST } from "./route";
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

describe("POST /api/github/disconnect", () => {
  const mockDb = {
    select: vi.fn(),
    delete: vi.fn(),
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

    // Default mock for delete chain
    mockDb.delete.mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });
  });

  it("returns 401 when user is not authenticated", async () => {
    (auth as any).mockResolvedValue({ userId: null });

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns 404 when no installation found", async () => {
    (auth as any).mockResolvedValue({ userId: "user_123" });

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toEqual({ error: "No GitHub installation found" });
  });

  it("successfully disconnects GitHub installation", async () => {
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

    const deleteReposSpy = vi.fn().mockResolvedValue(undefined);
    const deleteInstallationSpy = vi.fn().mockResolvedValue(undefined);

    mockDb.delete
      .mockReturnValueOnce({
        where: deleteReposSpy,
      })
      .mockReturnValueOnce({
        where: deleteInstallationSpy,
      });

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ message: "GitHub account disconnected successfully" });
    
    // Verify delete operations were called
    expect(mockDb.delete).toHaveBeenCalledTimes(2);
    expect(deleteReposSpy).toHaveBeenCalled();
    expect(deleteInstallationSpy).toHaveBeenCalled();
  });

  it("handles database errors gracefully", async () => {
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

    // Make delete operation fail
    mockDb.delete.mockReturnValue({
      where: vi.fn().mockRejectedValue(new Error("Database error")),
    });

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Failed to disconnect GitHub account" });
  });

  it("handles errors when fetching installation", async () => {
    (auth as any).mockResolvedValue({ userId: "user_123" });

    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockRejectedValue(new Error("Database connection failed")),
        }),
      }),
    });

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Failed to disconnect GitHub account" });
  });
});