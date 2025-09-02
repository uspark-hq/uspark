import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { initServices } from "../../../../../src/lib/init-services";
import { DEVICE_CODES_TBL } from "../../../../../src/db/schema/device-codes";
import { eq } from "drizzle-orm";

// Mock Clerk auth
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

import { POST } from "./route";
import { auth } from "@clerk/nextjs/server";

describe("/api/cli/auth/verify-device", () => {
  beforeEach(async () => {
    // Clean up any existing device codes before each test
    initServices();
    await globalThis.services.db.delete(DEVICE_CODES_TBL);
  });

  it("should verify and associate device code with authenticated user", async () => {
    // Mock authenticated user
    vi.mocked(auth).mockResolvedValue({ userId: "user_123" } as Awaited<
      ReturnType<typeof auth>
    >);

    // Create a device code in the database
    const deviceCode = "TEST-1234";
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

    await globalThis.services.db.insert(DEVICE_CODES_TBL).values({
      code: deviceCode,
      expiresAt: expiresAt,
      createdAt: new Date(),
    });

    const request = new NextRequest(
      "http://localhost/api/cli/auth/verify-device",
      {
        method: "POST",
        body: JSON.stringify({
          device_code: deviceCode,
        }),
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.message).toBe("Device authorized successfully");

    // Verify the device code was updated with userId
    const updatedCodes = await globalThis.services.db
      .select()
      .from(DEVICE_CODES_TBL)
      .where(eq(DEVICE_CODES_TBL.code, deviceCode));

    expect(updatedCodes.length).toBe(1);
    expect(updatedCodes[0]?.userId).toBe("user_123");
  });

  it("should return error for unauthenticated user", async () => {
    // Mock unauthenticated user
    vi.mocked(auth).mockResolvedValue({ userId: null } as Awaited<
      ReturnType<typeof auth>
    >);

    const request = new NextRequest(
      "http://localhost/api/cli/auth/verify-device",
      {
        method: "POST",
        body: JSON.stringify({
          device_code: "TEST-1234",
        }),
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(401);

    const data = await response.json();
    expect(data.error).toBe("unauthorized");
    expect(data.error_description).toBe("Authentication required");
  });

  it("should return error for missing device code", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user_123" } as Awaited<
      ReturnType<typeof auth>
    >);

    const request = new NextRequest(
      "http://localhost/api/cli/auth/verify-device",
      {
        method: "POST",
        body: JSON.stringify({}),
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("invalid_request");
    expect(data.error_description).toBe("Device code is required");
  });

  it("should return error for invalid device code", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user_123" } as Awaited<
      ReturnType<typeof auth>
    >);

    const request = new NextRequest(
      "http://localhost/api/cli/auth/verify-device",
      {
        method: "POST",
        body: JSON.stringify({
          device_code: "INVALID-CODE",
        }),
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("invalid_grant");
    expect(data.error_description).toBe("Invalid or expired device code");
  });

  it("should return error for expired device code", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user_123" } as Awaited<
      ReturnType<typeof auth>
    >);

    // Create an expired device code
    const deviceCode = "EXPI-1234";
    const expiresAt = new Date(Date.now() - 1000); // Already expired

    await globalThis.services.db.insert(DEVICE_CODES_TBL).values({
      code: deviceCode,
      expiresAt: expiresAt,
      createdAt: new Date(Date.now() - 20 * 60 * 1000),
    });

    const request = new NextRequest(
      "http://localhost/api/cli/auth/verify-device",
      {
        method: "POST",
        body: JSON.stringify({
          device_code: deviceCode,
        }),
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("invalid_grant");
    expect(data.error_description).toBe("Invalid or expired device code");
  });

  it("should return error for already used device code", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user_456" } as Awaited<
      ReturnType<typeof auth>
    >);

    // Create a device code that was already used
    const deviceCode = "USED-1234";
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await globalThis.services.db.insert(DEVICE_CODES_TBL).values({
      code: deviceCode,
      userId: "user_123", // Already associated with a user
      expiresAt: expiresAt,
      createdAt: new Date(),
    });

    const request = new NextRequest(
      "http://localhost/api/cli/auth/verify-device",
      {
        method: "POST",
        body: JSON.stringify({
          device_code: deviceCode,
        }),
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe("invalid_grant");
    expect(data.error_description).toBe("Device code has already been used");
  });
});
